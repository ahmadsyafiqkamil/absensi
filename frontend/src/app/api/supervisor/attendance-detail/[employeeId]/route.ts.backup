import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string } }
) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const month = searchParams.get('month')
    
    // Build query string
    const queryParams = new URLSearchParams()
    if (startDate) queryParams.append('start_date', startDate)
    if (endDate) queryParams.append('end_date', endDate)
    if (month) queryParams.append('month', month)
    
    const queryString = queryParams.toString()
    const url = `/api/supervisor/attendance-detail/${params.employeeId}${queryString ? `?${queryString}` : ''}`
    
    const response = await backendFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching supervisor attendance detail:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
