import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = getBackendUrl()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await params

    const response = await fetch(`${BACKEND_URL}/api/v2/overtime/overtime/${id}/reject/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error rejecting overtime request:', error)
    return NextResponse.json(
      { error: 'Failed to reject overtime request' },
      { status: 500 }
    )
  }
}
