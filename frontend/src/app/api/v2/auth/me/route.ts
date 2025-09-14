import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendUrl()
    const resp = await fetch(`${backend}/api/v2/auth/me/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!resp.ok) {
      return NextResponse.json({ detail: 'Authentication failed' }, { status: resp.status })
    }

    const data = await resp.json()
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in V2 auth me API:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
