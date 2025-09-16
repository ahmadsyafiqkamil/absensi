import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = process.env.BACKEND_URL || 'http://backend:8000'
    // Backend today endpoint lives under /attendance/attendance/today/
    const url = `${backend}/api/v2/attendance/attendance/today/`

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
    console.error('Error proxying V2 attendance today API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
