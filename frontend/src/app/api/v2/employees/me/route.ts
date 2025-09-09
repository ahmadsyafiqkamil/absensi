import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const backend = getBackendUrl()

    // Use legacy employee API instead of v2
    const url = `${backend}/api/employee/employees`

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      cache: 'no-store'
    })

    const data = await resp.json().catch(() => ({}))

    // Transform legacy API response to match expected format
    if (resp.ok && data.results && Array.isArray(data.results) && data.results.length > 0) {
      const employee = data.results[0]
      return NextResponse.json(employee, { status: 200 })
    }

    return NextResponse.json(data, { status: resp.status })
  } catch (error) {
    console.error('Error proxying employees me API:', error)
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 })
  }
}
