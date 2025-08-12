import { NextResponse } from 'next/server'
import { loginRequest } from '@/lib/backend'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { resp, data } = await loginRequest(body.username, body.password)
  if (!resp.ok) {
    return NextResponse.json(data, { status: resp.status })
  }

  const res = NextResponse.json({ ok: true })
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('access_token', data.access, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
  res.cookies.set('refresh_token', data.refresh, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
  return res
}


