import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    console.log('v2 Login request body:', body)
    
    // Use v2 API login endpoint
    const response = await fetch(`${process.env.BACKEND_URL || 'http://backend:8000'}/api/v2/users/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: body.username, password: body.password }),
      cache: 'no-store'
    })
    
    const data = await response.json()
    console.log('v2 Login response status:', response.status)
    console.log('v2 Login response data:', data)
    
    if (!response.ok) {
      console.log('v2 Login failed, returning error response')
      return NextResponse.json(data, { status: response.status })
    }

    console.log('v2 Login successful, setting cookies...')
    console.log('Access token length:', data.access?.length || 0)
    console.log('NODE_ENV:', process.env.NODE_ENV)

    const res = NextResponse.json({ ok: true, message: 'Login successful (v2)' })
    // Force secure cookies for HTTPS
    const secure = true
    console.log('Setting cookies with secure:', secure)
    
    res.cookies.set('access_token', data.access, { httpOnly: false, secure, sameSite: 'lax', path: '/' })
    res.cookies.set('refresh_token', data.refresh, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
    
    console.log('v2 Cookies set successfully')
    console.log('Response headers:', Object.fromEntries(res.headers.entries()))
    
    return res
    
  } catch (error) {
    console.error('v2 Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


