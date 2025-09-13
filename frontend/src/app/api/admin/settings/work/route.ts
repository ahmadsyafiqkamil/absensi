import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

async function ensureAdmin() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  const backendBase = getBackendUrl()
  const meResponse = await fetch(`${backendBase}/api/v2/users/me`, {
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
  const resp = await fetch(`${chk.backendBase}/api/v2/settings/work/`, {
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
  
  // Cek apakah WorkSettings sudah ada
  let settingsExists = false
  let id = body?.id
  
  try {
    const getResp = await fetch(`${chk.backendBase}/api/v2/settings/work/`, {
      headers: { Authorization: `Bearer ${chk.accessToken}` },
    })
    if (getResp.ok) {
      const settings = await getResp.json()
      settingsExists = true
      id = settings.id
    }
  } catch (e) {
    console.error('Error checking settings:', e)
  }
  
  let resp
  if (settingsExists && id) {
    // Update existing settings
    resp = await fetch(`${chk.backendBase}/api/v2/settings/work/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
  } else {
    // Create new settings
    resp = await fetch(`${chk.backendBase}/api/v2/settings/work/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chk.accessToken}` },
      body: JSON.stringify(body),
    })
  }
  
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}


