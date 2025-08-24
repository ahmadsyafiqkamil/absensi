import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { meRequest } from '@/lib/backend'

export async function GET() {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })
  const { resp, data } = await meRequest(access)
  return NextResponse.json(data, { status: resp.status })
}


