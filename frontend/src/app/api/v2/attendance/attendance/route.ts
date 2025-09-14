import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendUrl()
    const search = request.nextUrl.search || ''
    const url = `${backend}/api/v2/attendance/attendance/${search}`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    })

    const data = await resp.json().catch(() => ({}))

    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('Error proxying V2 attendance list API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
