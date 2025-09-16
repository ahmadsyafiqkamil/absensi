import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

async function ensureAdmin() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  const backendBase = getBackendUrl()
  const meResponse = await fetch(`${backendBase}/api/v2/auth/me/`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!meResponse.ok) return { ok: false, status: 401 as const }
  const userData = await meResponse.json()
  const isAdmin = userData.groups?.includes('admin') || userData.is_superuser
  return { ok: isAdmin, status: isAdmin ? 200 : 403, accessToken, backendBase }
}

export async function GET() {
  const chk = await ensureAdmin()
  if (!chk.ok) return NextResponse.json({ detail: 'Forbidden' }, { status: chk.status })
  const resp = await fetch(`${chk.backendBase}/api/v2/settings/admin/work/`, {
    headers: { Authorization: `Bearer ${chk.accessToken}` },
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}

export async function PUT(req: Request) {
  const chk = await ensureAdmin()
  if (!chk.ok) return NextResponse.json({ detail: 'Forbidden' }, { status: chk.status })
  const body = await req.json().catch(() => ({}))
  const id = body?.id
  
  if (!id) {
    // No ID provided, try to create new work settings
    const resp = await fetch(`${chk.backendBase}/api/v2/settings/admin/work/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } else {
    // ID provided, update existing work settings
    const resp = await fetch(`${chk.backendBase}/api/v2/settings/admin/work/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  }
}


