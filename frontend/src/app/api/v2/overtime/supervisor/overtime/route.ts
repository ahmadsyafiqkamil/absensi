import { NextRequest, NextResponse } from 'next/server'
import { getBackendBaseUrl, getAccessToken } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backendUrl = `${getBackendBaseUrl()}/api/v2/overtime/supervisor/overtime/`

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying supervisor overtime request:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
