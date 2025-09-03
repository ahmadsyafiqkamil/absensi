import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  const body = await req.json().catch(() => ({} as any))
  const { id } = await params
  const resp = await fetch(`${backend}/api/attendance-corrections/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body || {}),
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}


