import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the backend URL from environment
    const backend = process.env.BACKEND_URL || 'http://backend:8000'
    
    // Get cookies from the request
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    
    // Prepare headers for the backend request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Add authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    // Get the id from params
    const { id } = await params
    
    // Forward the request to the backend
    const backendResponse = await fetch(`${backend}/api/v2/notifications/admin/notifications/${id}/archive/`, {
      method: 'POST',
      headers,
      // Disable SSL verification for self-signed certificates
      // @ts-ignore
      rejectUnauthorized: false,
    })
    
    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: 'Failed to archive notification' }))
      return NextResponse.json(
        { error: errorData.error || 'Failed to archive notification', status: backendResponse.status },
        { status: backendResponse.status }
      )
    }
    
    const data = await backendResponse.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in archive notification proxy:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
