import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

interface Params {
  params: {
    id: string
  }
}

export async function GET(request: Request, { params }: Params) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/${params.id}/`, {
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/${params.id}/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/${params.id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

