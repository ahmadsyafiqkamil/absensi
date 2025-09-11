import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const accessToken = (await cookies()).get('access_token')?.value
  if (!accessToken) return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  
  try {
    const url = new URL(req.url)
    const search = url.search ? url.search : ''
    
    // Use v2 API attendance endpoint
    const response = await fetch(`${process.env.BACKEND_URL || 'http://backend:8000'}/api/v2/attendance/attendance${search}`, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
    })
    
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('v2 API attendance/me error:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}


