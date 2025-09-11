import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { v2Api } from '@/lib/backend'

export async function GET() {
  const access = (await cookies()).get('access_token')?.value
  if (!access) return NextResponse.json({ detail: 'unauthorized' }, { status: 401 })
  
  try {
    // Use v2 API with proper authentication header
    const response = await fetch(`${process.env.BACKEND_URL || 'http://backend:8000'}/api/v2/users/me`, {
      headers: { 
        'Authorization': `Bearer ${access}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })
    
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('v2 API /users/me error:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}


