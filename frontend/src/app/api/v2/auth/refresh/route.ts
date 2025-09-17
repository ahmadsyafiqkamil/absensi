import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend v2 refresh endpoint
    const response = await proxyToBackend(request, 'auth/refresh/', {
      method: 'POST',
      body,
    })
    
    // If refresh successful, handle cookie setting
    if (response.ok) {
      const data = await response.json()
      
      // Create response with cookies
      const nextResponse = NextResponse.json(data)
      
      // Set new access token cookie
      if (data.access) {
        nextResponse.cookies.set('access_token', data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        })
      }
      
      return nextResponse
    }
    
    return response
  } catch (error) {
    console.error('Refresh API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
