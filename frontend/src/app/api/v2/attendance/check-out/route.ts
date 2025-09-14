import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    
    const backend = getBackendUrl()
    const resp = await fetch(`${backend}/api/v2/attendance/employee/attendance/check-out/`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in V2 check-out API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}