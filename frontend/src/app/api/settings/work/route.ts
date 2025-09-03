import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function ensureAuthenticated() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  const meResponse = await fetch(`${backendBase}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!meResponse.ok) return { ok: false, status: 401 as const }
  return { ok: true, status: 200, accessToken, backendBase }
}

export async function GET() {
  const chk = await ensureAuthenticated()
  if (!chk.ok) return NextResponse.json({ detail: 'Unauthorized' }, { status: chk.status })
  
  try {
    const resp = await fetch(`${chk.backendBase}/api/settings/work/`, {
      headers: { Authorization: `Bearer ${chk.accessToken}` },
      cache: 'no-store',
    })
    
    if (!resp.ok) {
      return NextResponse.json({ detail: 'Failed to fetch work settings' }, { status: resp.status })
    }
    
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
