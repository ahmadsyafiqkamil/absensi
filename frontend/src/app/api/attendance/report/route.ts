import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
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
    const month = searchParams.get('month')
    
    // Build query string with proper priority handling
    const queryParams = new URLSearchParams()
    
    // Priority: month filter overrides date range filters
    if (month) {
      queryParams.append('month', month)
    } else {
      // Only use date range if month is not set
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)
    }
    
    const queryString = queryParams.toString()
    const url = `api/v2/attendance/attendance/summary/${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(`${getBackendUrl()}/${url}`, {
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
    
    const v2Data = await response.json()
    
    // Transform V2 response to match expected frontend structure
    const transformedData = {
      summary: {
        total_days: v2Data.total_days || 0,
        present_days: v2Data.check_ins || 0,
        late_days: v2Data.late_days || 0,
        absent_days: (v2Data.work_days || 0) - (v2Data.check_ins || 0),
        attendance_rate: v2Data.work_days > 0 ? ((v2Data.check_ins || 0) / v2Data.work_days) * 100 : 0,
        total_late_minutes: 0, // Not available in V2 response
        total_work_minutes: v2Data.total_work_minutes || 0,
        average_work_minutes: v2Data.work_days > 0 ? (v2Data.total_work_minutes || 0) / v2Data.work_days : 0
      },
      attendance_records: (v2Data.attendances || []).map((att: any, index: number) => ({
        id: index + 1, // Generate ID for frontend compatibility
        date_local: att.date,
        check_in_at_utc: att.check_in,
        check_out_at_utc: att.check_out,
        check_in_lat: null,
        check_in_lng: null,
        check_out_lat: null,
        check_out_lng: null,
        check_in_ip: null,
        check_out_ip: null,
        minutes_late: att.minutes_late || 0,
        total_work_minutes: att.work_minutes || 0,
        is_holiday: att.is_holiday || false,
        within_geofence: true, // Default to true for V2 compatibility
        note: null,
        employee_note: null,
        created_at: att.date,
        updated_at: att.date
      })),
      filters: {
        start_date: startDate,
        end_date: endDate,
        month: month
      }
    }
    
    return NextResponse.json(transformedData)
  } catch (error) {
    console.error('Error fetching attendance report:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
