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
  within_geofence?: boolean
  employee_note?: string | null
}

function fmtTime(iso: string | null, tz: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Dubai' }) + ` (${tz || 'Asia/Dubai'})`
  } catch {
    return '-'
  }
}

export default function TodayAttendance() {
  const [data, setData] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [now, setNow] = useState<Date>(new Date())

  function toISODate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const today = new Date()
      const q = `?start=${toISODate(today)}&end=${toISODate(today)}`
      const [attResp, holResp] = await Promise.all([
        fetch('/api/attendance/me?page=1&page_size=1'),
        fetch(`/api/attendance/holidays/${q}`),
      ])
      const d = await attResp.json().catch(() => ({}))
      const att = Array.isArray(d) ? (d[0] || null) : (d?.results?.[0] || null)
      setData(att || null)

      const holD = await holResp.json().catch(() => ({}))
      const holItems = Array.isArray(holD) ? holD : (holD?.results || [])
      setIsHoliday((holItems?.length || 0) > 0)

      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const nowDate = new Date()
    const nextMidnight = new Date(nowDate)
    nextMidnight.setHours(24, 0, 0, 0)
    const ms = nextMidnight.getTime() - nowDate.getTime()
    const t = setTimeout(() => window.location.reload(), ms)
    return () => clearTimeout(t)
  }, [])

  const workHours = useMemo(() => {
    if (!data || !data.total_work_minutes) return '-'
    const h = Math.floor(data.total_work_minutes / 60)
    const m = data.total_work_minutes % 60
    return `${h}j ${m}m`
  }, [data])

  const dayName = now.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateLabel = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dubai' }) + ' (Dubai)'
  const jsDay = now.getDay() // 0=Min..6=Sab
  const isWeekend = jsDay === 0 || jsDay === 6
  const statusHari = isWeekend || isHoliday ? 'Libur' : 'Hari Kerja'
  const statusDetail = isWeekend ? 'Libur Akhir Pekan' : (isHoliday ? 'Libur Nasional' : 'Hari Kerja')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absen Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 text-sm">
        {loading ? (
          <div className="text-gray-600">Memuat...</div>
        ) : (
          <>
            <div><span className="text-gray-500">Tanggal:</span> {dateLabel} ({dayName})</div>
            <div><span className="text-gray-500">Status:</span> {statusHari}{statusDetail !== statusHari ? ` - ${statusDetail}` : ''}</div>
            <div><span className="text-gray-500">Jam:</span> {timeLabel}</div>
            {!data ? (
              <div className="text-gray-600">Belum ada data absen hari ini.</div>
            ) : (
              <>
                <div><span className="text-gray-500">Jam Check In:</span> {fmtTime(data.check_in_at_utc, data.timezone)}</div>
                <div><span className="text-gray-500">Jam Check Out:</span> {fmtTime(data.check_out_at_utc, data.timezone)}</div>
                <div><span className="text-gray-500">Waktu Kerja:</span> {workHours}</div>
                <div><span className="text-gray-500">Lokasi In:</span> {data.check_in_lat && data.check_in_lng ? `${data.check_in_lat}, ${data.check_in_lng} (${data.within_geofence === false ? 'di luar kantor' : 'di dalam kantor'})` : '-'}</div>
                <div><span className="text-gray-500">Lokasi Out:</span> {data.check_out_lat && data.check_out_lng ? `${data.check_out_lat}, ${data.check_out_lng} (di dalam kantor)` : '-'}</div>
                <div><span className="text-gray-500">Keterangan:</span> {data.employee_note?.trim() ? data.employee_note : '-'}</div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}


