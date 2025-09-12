import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/api-utils'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = getBackendUrl()

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Note: potential_overtime action not yet implemented in v2
    // For now, return empty array as fallback
    return NextResponse.json([])
  } catch (error) {
    console.error('Error fetching potential overtime:', error)
    return NextResponse.json(
      { error: 'Failed to fetch potential overtime' },
      { status: 500 }
    )
  }
}
