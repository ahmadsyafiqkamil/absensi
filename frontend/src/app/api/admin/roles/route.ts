import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

export async function GET(request: Request) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const searchParams = url.searchParams

    const backendUrl = `${BACKEND_BASE_URL}/api/admin/roles/`
    const backendUrlWithParams = searchParams.toString()
      ? `${backendUrl}?${searchParams.toString()}`
      : backendUrl

    const response = await fetch(backendUrlWithParams, {
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

