import { NextRequest, NextResponse } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    // Get the access token from cookies
    const token = request.cookies.get('access_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    
    // Build the backend URL
    const backendUrl = `${getBackendBaseUrl()}/api/v2/corrections/supervisor/corrections/?status=${status}`
    
    console.log('Fetching supervisor corrections from:', backendUrl)
    
    // Fetch from backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Backend response not ok:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch corrections data' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend response data:', data)
    
    // Transform the data if needed to match expected frontend format
    const transformedData = Array.isArray(data) ? data : (data.results || [])
    
    return NextResponse.json(transformedData)
    
  } catch (error) {
    console.error('Error in supervisor corrections API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
