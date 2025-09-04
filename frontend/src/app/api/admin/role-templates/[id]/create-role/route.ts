import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

interface RouteParams {
  params: Promise<{   
    id: string
  }>
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/role-templates/${id}/create-role/`, {
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
    console.error('Error creating role from template:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
