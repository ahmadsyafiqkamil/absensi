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

    // Forward query parameters and map to v2
    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()

    // Map month -> start_date & end_date if provided
    const month = searchParams.get('month')
    if (month) {
      try {
        const [y, m] = month.split('-').map(Number)
        const start = new Date(y, (m || 1) - 1, 1)
        const end = new Date(y, (m || 1), 0)
        params.append('start_date', start.toISOString().slice(0,10))
        params.append('end_date', end.toISOString().slice(0,10))
      } catch {}
    }

    // Pass through status/type filters if present (v2 supports these)
    const status = searchParams.get('status')
    if (status) params.append('status', status)
    const type = searchParams.get('type')
    if (type) params.append('request_type', type)

    const url = `${BACKEND_URL}/api/v2/overtime/overtime/${params.toString() ? `?${params.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    let rawText = ''
    let data: any = null
    try {
      rawText = await response.text()
      data = rawText ? JSON.parse(rawText) : (Array.isArray(rawText) ? rawText : [])
    } catch (e) {
      // Non-JSON response from backend
      if (!response.ok) {
        return NextResponse.json({ error: 'Upstream error', detail: rawText || 'No body' }, { status: response.status })
      }
      data = []
    }

    if (!response.ok) {
      return NextResponse.json(data || { error: 'Upstream error' }, { status: response.status })
    }

    // Normalize to legacy shape {count, next, previous, results}
    const results = Array.isArray(data) ? data : (data?.results || [])
    // Map v2 response back to v1 shape for legacy component compatibility
    const v1Results = results.map((item: any) => ({
      ...item,
      // Safe field mappings with fallbacks
      date_requested: item?.date || item?.requested_at || null,
      created_at: item?.requested_at || null,
      overtime_hours: item?.total_hours ?? item?.hours ?? 0,
      work_description: item?.purpose ?? item?.work_description ?? '',
      overtime_amount: item?.total_amount ?? '0',
      approved_by: item?.final_approved_by ?? null,
      approved_at: item?.final_approved_at ?? null,
    }))

    const normalized = Array.isArray(data) ? {
      count: v1Results.length,
      next: null,
      previous: null,
      results: v1Results,
    } : { ...data, results: v1Results };

    return NextResponse.json(normalized)
  } catch (error) {
    console.error('Error fetching overtime requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overtime requests', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const legacy = await request.json()

    // Map legacy body to v2 payload
    // Legacy: { date_requested, overtime_hours, work_description }
    // V2: { request_type, date, start_time, end_time, purpose, work_description }
    const hours = parseFloat(legacy.overtime_hours || '0') || 1
    const startTime = legacy.start_time || '18:00:00'
    // Compute end_time from hours
    const [sh, sm, ss] = startTime.split(':').map((x: string) => parseInt(x || '0', 10))
    const endMinutesTotal = (sh * 60 + sm) + Math.round(hours * 60)
    const eh = Math.floor(endMinutesTotal / 60) % 24
    const em = endMinutesTotal % 60
    const endTime = `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}:00`

    const payload = {
      request_type: (legacy.request_type || 'regular') as 'regular' | 'holiday' | 'weekend' | 'emergency',
      date: legacy.date || legacy.date_requested,
      start_time: startTime,
      end_time: endTime,
      total_hours: hours,
      purpose: legacy.purpose || legacy.work_description || '',
      work_description: legacy.work_description || '',
      attendance_id: null, // Will be handled by backend to find or create attendance record
      is_quick_submit: legacy.is_quick_submit || false, // Flag for quick submit from potential overtime table
    }

    const response = await fetch(`${BACKEND_URL}/api/v2/overtime/overtime/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating overtime request:', error)
    return NextResponse.json(
      { error: 'Failed to create overtime request' },
      { status: 500 }
    )
  }
}
