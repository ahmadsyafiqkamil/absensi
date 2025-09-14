import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()
    
    // Forward all query parameters
    for (const [key, value] of searchParams.entries()) {
      params.append(key, value)
    }

    const backend = getBackendUrl()
    const url = `${backend}/api/v2/corrections/corrections/correction_records/?${params.toString()}`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    })

    const data = await resp.json().catch(() => ({}))

    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('Error proxying V2 correction records API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
