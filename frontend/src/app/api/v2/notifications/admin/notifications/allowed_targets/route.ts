import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get the backend URL from environment
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.siaki.kjri-dubai.local'
    
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
    
    // Forward the request to the backend
    const backendResponse = await fetch(`${backend}/api/v2/notifications/admin/notifications/allowed_targets/`, {
      method: 'GET',
      headers,
      // Disable SSL verification for self-signed certificates
      // @ts-ignore
      rejectUnauthorized: false,
    })
    
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch allowed targets', status: backendResponse.status },
        { status: backendResponse.status }
      )
    }
    
    const data = await backendResponse.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in allowed targets proxy:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
