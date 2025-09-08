import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attendanceId: string }> }
) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const { attendanceId } = await params
    
    if (!attendanceId) {
      return NextResponse.json({ detail: 'Attendance ID is required' }, { status: 400 })
    }

    const backend = getBackendUrl()
    const url = `${backend}/api/overtime/${attendanceId}/approve`
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    })

    const data = await resp.json().catch(() => ({}))
    
    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('Error in overtime approval API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
