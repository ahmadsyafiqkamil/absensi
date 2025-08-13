"use client";

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Attendance = {
  id: number
  date_local: string
  timezone: string
  check_in_at_utc: string | null
  check_in_lat: string | null
  check_in_lng: string | null
  check_out_at_utc: string | null
  check_out_lat: string | null
  check_out_lng: string | null
  minutes_late: number
  total_work_minutes: number
}

function fmtTime(iso: string | null, tz: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  } catch {
    return '-'
  }
}

export default function TodayAttendance() {
  const [data, setData] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const r = await fetch('/api/attendance/me?page=1&page_size=1')
      const d = await r.json().catch(() => ({}))
      const att = Array.isArray(d) ? (d[0] || null) : (d?.results?.[0] || null)
      setData(att || null)
      setLoading(false)
    })()
  }, [])

  const workHours = useMemo(() => {
    if (!data || !data.total_work_minutes) return '-'
    const h = Math.floor(data.total_work_minutes / 60)
    const m = data.total_work_minutes % 60
    return `${h}j ${m}m`
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absen Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 text-sm">
        {loading ? (
          <div className="text-gray-600">Memuat...</div>
        ) : !data ? (
          <div className="text-gray-600">Belum ada data absen hari ini.</div>
        ) : (
          <>
            <div><span className="text-gray-500">Tanggal:</span> {data.date_local}</div>
            <div><span className="text-gray-500">Jam Check In:</span> {fmtTime(data.check_in_at_utc, data.timezone)}</div>
            <div><span className="text-gray-500">Jam Check Out:</span> {fmtTime(data.check_out_at_utc, data.timezone)}</div>
            <div><span className="text-gray-500">Waktu Kerja:</span> {workHours}</div>
            <div><span className="text-gray-500">Lokasi In:</span> {data.check_in_lat && data.check_in_lng ? `${data.check_in_lat}, ${data.check_in_lng}` : '-'}</div>
            <div><span className="text-gray-500">Lokasi Out:</span> {data.check_out_lat && data.check_out_lng ? `${data.check_out_lat}, ${data.check_out_lng}` : '-'}</div>
          </>
        )}
      </CardContent>
    </Card>
  )
}


