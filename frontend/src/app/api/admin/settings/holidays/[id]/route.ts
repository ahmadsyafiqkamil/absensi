import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function ensureAdmin() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
  const meResponse = await fetch(`${backendBase}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!meResponse.ok) return { ok: false, status: 401 as const }
  const userData = await meResponse.json()
  const isAdmin = userData.groups?.includes('admin') || userData.is_superuser
  return { ok: isAdmin, status: isAdmin ? 200 : 403, accessToken, backendBase }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const chk = await ensureAdmin()
  if (!chk.ok) return NextResponse.json({ detail: 'Forbidden' }, { status: chk.status })
  const resp = await fetch(`${chk.backendBase}/api/settings/holidays/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${chk.accessToken}` },
  })
  if (resp.status === 204) return NextResponse.json({ ok: true })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}


