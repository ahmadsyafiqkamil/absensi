import { getBackendBaseUrl, getAccessToken } from '@/lib/backend'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const backendUrl = `${getBackendBaseUrl()}/api/v2/overtime/overtime/${(await params).id}/reject/`
  const body = await request.json()

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error proxying overtime rejection request:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

