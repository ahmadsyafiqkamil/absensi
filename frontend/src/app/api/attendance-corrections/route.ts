import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
  const url = new URL(req.url)
  const search = url.search ? url.search : ''
  const resp = await fetch(`${backend}/api/attendance-corrections/${search}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}

export async function POST(req: Request) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
  const body = await req.json().catch(() => ({}))
  const resp = await fetch(`${backend}/api/attendance-corrections/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}


