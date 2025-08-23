import { NextResponse } from 'next/server'
import { loginRequest } from '@/lib/backend'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { resp, data } = await loginRequest(body.username, body.password)
  if (!resp.ok) {
    return NextResponse.json(data, { status: resp.status })
  }

  console.log('Login successful, setting cookies...')
  console.log('Access token length:', data.access?.length || 0)
  console.log('NODE_ENV:', process.env.NODE_ENV)

  const res = NextResponse.json({ ok: true })
  const secure = process.env.NODE_ENV === 'production'
  console.log('Setting cookies with secure:', secure)
  
  res.cookies.set('access_token', data.access, { httpOnly: false, secure, sameSite: 'lax', path: '/' })
  res.cookies.set('refresh_token', data.refresh, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
  return res
}


