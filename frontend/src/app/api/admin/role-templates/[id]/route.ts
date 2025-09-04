import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/role-templates/${id}/`, {
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching role template:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/role-templates/${id}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error updating role template:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/role-templates/${id}/`, {
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
    console.error('Error deleting role template:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
