import { getBackendBaseUrl, getAccessToken } from '@/lib/backend'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken()

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Forward query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${getBackendBaseUrl()}/api/v2/overtime/summary/${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(errorData, { status: response.status })
    }

    const data = await response.json()
    
    // Map backend response to frontend expected format
    const mappedData = {
      total_requests: data.total_requests || 0,
      pending_requests: data.pending_requests || 0,
      level1_approved_requests: data.level1_approved_requests || 0,
      approved_requests: data.approved_requests || 0,
      rejected_requests: data.rejected_requests || 0,
      total_approved_hours: data.total_hours || 0,
      total_approved_amount: data.total_amount || 0,
    }

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error('Error fetching overtime summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overtime summary' },
      { status: 500 }
    )
  }
}
