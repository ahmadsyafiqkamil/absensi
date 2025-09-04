import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = getBackendUrl()

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${BACKEND_URL}/api/overtime-requests/potential_overtime/${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching potential overtime:', error)
    return NextResponse.json(
      { error: 'Failed to fetch potential overtime' },
      { status: 500 }
    )
  }
}
