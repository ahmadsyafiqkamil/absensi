import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  const refresh = cookieStore.get('refresh_token')?.value
  if (!refresh) {
    return NextResponse.json({ detail: 'no refresh token' }, { status: 401 })
  }

  const backend = getBackendUrl()
  const resp = await fetch(`${backend}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({} as any))
  if (!resp.ok || !data.access) {
    // Clear cookies on failure
    const res = NextResponse.json({ detail: 'refresh_failed' }, { status: 401 })
    const past = new Date(0)
    res.cookies.set('access_token', '', { expires: past, path: '/' })
    res.cookies.set('refresh_token', '', { expires: past, path: '/' })
    return res
  }

  const res = NextResponse.json({ access: data.access, refresh: data.refresh }, { status: 200 })
  const secure = process.env.NODE_ENV === 'production'
  res.cookies.set('access_token', data.access, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
  // If backend rotates refresh (we disabled), support setting when provided
  if (data.refresh) {
    res.cookies.set('refresh_token', data.refresh, { httpOnly: true, secure, sameSite: 'lax', path: '/' })
  }
  return res
}


