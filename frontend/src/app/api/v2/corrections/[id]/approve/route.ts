import { NextRequest, NextResponse } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const token = request.cookies.get('access_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 })
    }

    const body = await request.json()
    const { decision_note } = body
    
    // Build the backend URL for approval
    const backendUrl = `${getBackendBaseUrl()}/api/v2/corrections/corrections/${id}/approve/`
    
    console.log('Approving correction:', { id, backendUrl, decision_note })
    
    // Send approval request to backend with correct V2 format
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'approve',
        reason: decision_note
      }),
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('Backend approval response not ok:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Backend error response:', errorText)
      
      let errorMessage = 'Failed to approve correction'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.detail || errorMessage
      } catch {
        // Use default error message
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend approval response:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in correction approval API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
