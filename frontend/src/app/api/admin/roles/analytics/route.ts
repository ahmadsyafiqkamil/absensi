import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

export async function GET(request: Request) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'usage'

    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/analytics/${type}/`, {
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching role analytics:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
