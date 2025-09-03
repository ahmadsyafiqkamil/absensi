import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { BACKEND_BASE_URL } from '@/lib/backend'

interface Params {
  params: {
    id: string
  }
}

export async function POST(request: Request, { params }: Params) {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/admin/roles/${params.id}/toggle_active/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error toggling role active status:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}

