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

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const chk = await ensureAuthenticated()
  if (!chk.ok) return NextResponse.json({ detail: 'Unauthorized' }, { status: chk.status })
  
  const resp = await fetch(`${chk.backendBase}/api/v2/employees/employee-positions/${id}/deactivate/`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${chk.accessToken}` 
    },
  })
  
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}
