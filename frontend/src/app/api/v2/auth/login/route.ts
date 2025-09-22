import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend v2 login endpoint
    const response = await proxyToBackend(request, 'auth/login/', {
      method: 'POST',
      body,
    })
    
    // If login successful, handle cookie setting
    if (response.ok) {
      const data = await response.json()
      
      // Create response with cookies
      const nextResponse = NextResponse.json(data)
      
      // Set access token cookie
      if (data.access) {
        nextResponse.cookies.set('access_token', data.access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        })
        
        // Also set a non-HttpOnly cookie for client-side access (less secure but needed for position switching)
        nextResponse.cookies.set('client_access_token', data.access, {
          httpOnly: false, // Allow JavaScript access
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        })
      }
      
      // Set refresh token cookie
      if (data.refresh) {
        nextResponse.cookies.set('refresh_token', data.refresh, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        })
      }
      
      return nextResponse
    }
    
    return response
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
