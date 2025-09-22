import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

async function ensureAuthenticated() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  
  const backendBase = getBackendUrl()
  
  // Verify token with backend
  const meResponse = await fetch(`${backendBase}/api/v2/auth/me/`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  
  if (!meResponse.ok) return { ok: false, status: 401 as const }
  
  const userData = await meResponse.json()
  const isAdmin = userData.groups?.includes('admin') || userData.is_superuser
  
  if (!isAdmin) return { ok: false, status: 403 as const }
  
  return { ok: true, status: 200, accessToken, backendBase }
}

export async function POST(req: Request) {
  const chk = await ensureAuthenticated()
  if (!chk.ok) {
    const message = chk.status === 401 ? 'Please login first' : 'Admin access required'
    return NextResponse.json({ detail: message }, { status: chk.status })
  }
  
  const body = await req.json().catch(() => ({}))
  const resp = await fetch(`${chk.backendBase}/api/v2/employees/employee-positions/assign_position/`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${chk.accessToken}` 
    },
    body: JSON.stringify(body),
  })
  
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}
