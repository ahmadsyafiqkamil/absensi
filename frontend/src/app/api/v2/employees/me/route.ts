import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendBaseUrl, getAccessToken } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendBaseUrl()

    // Use v2 employee me endpoint
    const url = `${backend}/api/v2/employees/me/`

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
    console.error('Error proxying employees me API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
