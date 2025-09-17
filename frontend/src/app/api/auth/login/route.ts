import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    console.log('Login request body:', body)
    
    // Use V2 authentication endpoint
    const backend = getBackendUrl()
    const resp = await fetch(`${backend}/api/v2/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: body.username,
        password: body.password
      }),
      cache: 'no-store',
    })
    
    const data = await resp.json().catch(() => ({} as any))
    console.log('Login response status:', resp.status)
    console.log('Login response data:', data)
    
    if (!resp.ok) {
      console.log('Login failed, returning error response')
      return NextResponse.json(data, { status: resp.status })
    }

    console.log('Login successful, setting cookies...')
    console.log('Access token length:', data.access?.length || 0)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('Response data:', JSON.stringify(data, null, 2))

    const res = NextResponse.json({ ok: true, message: 'Login successful' })
    // Force secure cookies for HTTPS
    const secure = true
    console.log('Setting cookies with secure:', secure)
    
    res.cookies.set('access_token', data.access, { httpOnly: false, secure, sameSite: 'lax', path: '/' })
    res.cookies.set('refresh_token', data.refresh, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
    
    console.log('Cookies set successfully')
    console.log('Response headers:', Object.fromEntries(res.headers.entries()))
    
    return res
    
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


