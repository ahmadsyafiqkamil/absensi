import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    // Get form data from request
    let formData: FormData

    const contentType = request.headers.get('content-type') || ''

    console.log('Content-Type received:', contentType)

    // First, let's clone the request to avoid consuming the body twice
    const clonedRequest = request.clone()

    if (contentType.includes('multipart/form-data')) {
      console.log('Processing as FormData')
      formData = await request.formData()
    } else if (contentType.includes('application/json')) {
      console.log('Processing as JSON')
      // Handle JSON data
      try {
        const jsonData = await request.json()
        formData = new FormData()

        // Convert JSON to FormData
        for (const [key, value] of Object.entries(jsonData)) {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value))
            } else {
              formData.append(key, String(value))
            }
          }
        }
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError)
        // Debug: try to get raw body from cloned request
        try {
          const rawBody = await clonedRequest.text()
          console.error('Raw request body (first 200 chars):', rawBody.substring(0, 200))
          console.error('Raw body length:', rawBody.length)
        } catch (e) {
          console.error('Could not read raw body:', e)
        }
        return NextResponse.json(
          { detail: 'Invalid JSON format in request body' },
          { status: 400 }
        )
      }
    } else {
      console.log('Content-Type not recognized, trying FormData fallback')
      // Try to parse as form data anyway, but with better error handling
      try {
        formData = await request.formData()
      } catch (error) {
        console.error('Form data parsing error:', error)
        return NextResponse.json(
          { detail: 'Invalid content type. Expected multipart/form-data or application/json' },
          { status: 400 }
        )
      }
    }
    
    // Debug logging
    console.log('=== FRONTEND API ROUTE DEBUG ===')
    console.log('Original form data keys:', Array.from(formData.keys()))
    console.log('Original form data values:', Array.from(formData.entries()))
    
    // Transform form data to match V2 API expectations
    const transformedData = new FormData()
    
    // Copy basic fields
    for (const [key, value] of formData.entries()) {
      if (key === 'type') {
        // Map frontend 'type' to V2 'correction_type'
        transformedData.append('correction_type', value)
        console.log(`Mapped: ${key} -> correction_type`)
      } else if (key === 'proposed_check_in_time') {
        // Map to V2 expected field name
        transformedData.append('requested_check_in', value)
        console.log(`Mapped: ${key} -> requested_check_in`)
      } else if (key === 'proposed_check_out_time') {
        // Map to V2 expected field name
        transformedData.append('requested_check_out', value)
        console.log(`Mapped: ${key} -> requested_check_out`)
      } else if (key === 'attachment') {
        // Map to V2 expected field name
        transformedData.append('supporting_document', value)
        console.log(`Mapped: ${key} -> supporting_document`)
      } else {
        // Copy other fields as-is
        transformedData.append(key, value)
        console.log(`Copied as-is: ${key}`)
      }
    }
    
    console.log('Transformed form data keys:', Array.from(transformedData.keys()))
    console.log('Transformed form data values:', Array.from(transformedData.entries()))

    // Build backend URL
    const backend = getBackendUrl()
    const backendUrl = `${backend}/api/v2/corrections/corrections/`

    // Forward request to backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // Don't set Content-Type for FormData, let browser set it automatically
      },
      body: transformedData, // Use transformed form data
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { detail: errorData.detail || 'Backend request failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in V2 correction request API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
