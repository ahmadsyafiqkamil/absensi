import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

async function ensureAuthenticated() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return { ok: false, status: 401 as const }
  const backendBase = getBackendUrl()
  const meResponse = await fetch(`${backendBase}/api/v2/auth/me/`, {
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
    const resp = await fetch(`${chk.backendBase}/api/attendance-corrections/`, {
      headers: { Authorization: `Bearer ${chk.accessToken}` },
      cache: 'no-store',
    })
    
    if (!resp.ok) {
      return NextResponse.json({ detail: 'Failed to fetch corrections' }, { status: resp.status })
    }
    
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const chk = await ensureAuthenticated()
  if (!chk.ok) return NextResponse.json({ detail: 'Unauthorized' }, { status: chk.status })
  
  try {
    // Forward the request body (FormData) directly to the backend
    const body = await request.formData()
    
    const resp = await fetch(`${chk.backendBase}/api/attendance-corrections/`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${chk.accessToken}`,
        // Don't set Content-Type, let the browser set it with boundary for multipart/form-data
      },
      body: body,
    })
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      return NextResponse.json({ detail: errorData?.detail || 'Failed to create correction' }, { status: resp.status })
    }
    
    const data = await resp.json().catch(() => ({}))
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}


