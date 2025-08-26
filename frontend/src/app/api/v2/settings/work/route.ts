import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
    const url = `${backend}/api/v2/settings/work/`

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
    console.error('Error proxying V2 settings work API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
    const url = `${backend}/api/v2/settings/work/`

    const resp = await fetch(url, {
      method: 'PATCH',
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
    console.error('Error proxying V2 settings work update API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
