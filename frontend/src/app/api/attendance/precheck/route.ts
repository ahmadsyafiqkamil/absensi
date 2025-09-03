import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  const resp = await fetch(`${backend}/api/attendance/precheck`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}


