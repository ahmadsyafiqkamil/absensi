import { NextResponse } from 'next/server'
import { backendFetch } from '@/lib/backend'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const employeeId = searchParams.get('employee_id')
    
    // Build query string
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (employeeId) params.append('employee_id', employeeId)
    
    const queryString = params.toString()
    const url = `/supervisor/team-attendance${queryString ? `?${queryString}` : ''}`
    
    const response = await backendFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }, 'LEGACY')
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(errorData, { status: response.status })
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching supervisor team attendance:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
