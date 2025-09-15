import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendBaseUrl, getAccessToken } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const backend = getBackendBaseUrl()
    const url = `${backend}/api/v2/attendance/attendance/check_out/`

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    })

    const data = await resp.json().catch(() => ({}))

    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('Error proxying V2 attendance check-out API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
