import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  const url = new URL(req.url)
  const search = url.search ? url.search : ''
  const resp = await fetch(`${backendBase}/api/settings/holidays/${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}



