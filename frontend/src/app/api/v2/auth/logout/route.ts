import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    // Proxy to backend v2 logout endpoint
    const response = await proxyToBackend(request, 'auth/logout/', {
      method: 'POST',
    })
    
    // Create response and clear cookies
    const nextResponse = NextResponse.json(
      { message: 'Successfully logged out' },
      { status: 200 }
    )
    
    // Clear access token cookie
    nextResponse.cookies.set('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    
    // Clear refresh token cookie
    nextResponse.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
    
    return nextResponse
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
