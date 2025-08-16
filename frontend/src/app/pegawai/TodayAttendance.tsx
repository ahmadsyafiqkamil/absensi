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

type WorkSettings = {
  id: number
  timezone: string
  workdays: string[]
  start_time: string
  end_time: string
  friday_start_time: string
  friday_end_time: string
  office_latitude: string
  office_longitude: string
  geofence_radius_meters: number
}

function fmtTime(iso: string | null, tz: string) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz || 'Asia/Dubai' })
  } catch {
    return '-'
  }
}

function fmtDate(date: Date, timezone: string) {
  return date.toLocaleDateString('id-ID', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    timeZone: timezone
  })
}

function fmtTimeOnly(date: Date, timezone: string) {
  return date.toLocaleTimeString('id-ID', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    timeZone: timezone
  })
}

export default function TodayAttendance() {
  const [data, setData] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHoliday, setIsHoliday] = useState<boolean>(false)
  const [now, setNow] = useState<Date>(new Date())
  const [workSettings, setWorkSettings] = useState<WorkSettings | null>(null)

  function toISODate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const today = new Date()
      const q = `?start=${toISODate(today)}&end=${toISODate(today)}`
      
      try {
        const [attResp, holResp, settingsResp] = await Promise.all([
          fetch('/api/attendance/me?page=1&page_size=1'),
          fetch(`/api/attendance/holidays/${q}`),
          fetch('/api/settings/work'),
        ])
        
        const d = await attResp.json().catch(() => ({}))
        const att = Array.isArray(d) ? (d[0] || null) : (d?.results?.[0] || null)
        setData(att || null)

        const holD = await holResp.json().catch(() => ({}))
        const holItems = Array.isArray(holD) ? holD : (d?.results || [])
        setIsHoliday((holItems?.length || 0) > 0)

        const settingsData = await settingsResp.json().catch(() => ({}))
        if (settingsResp.ok && settingsData.results && settingsData.results.length > 0) {
          setWorkSettings(settingsData.results[0])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
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

  const jsDay = now.getDay() // 0=Min..6=Sab
  const isWeekend = jsDay === 0 || jsDay === 6
  const statusHari = isWeekend || isHoliday ? 'Libur' : 'Hari Kerja'
  const statusDetail = isWeekend ? 'Libur Akhir Pekan' : (isHoliday ? 'Libur Nasional' : 'Hari Kerja')
  const statusColor = isWeekend || isHoliday ? 'text-blue-600' : 'text-green-600'
  
  // Use timezone from work settings, fallback to Asia/Dubai
  const currentTimezone = workSettings?.timezone || 'Asia/Dubai'
  const timezoneLabel = currentTimezone === 'Asia/Dubai' ? 'Dubai' : currentTimezone

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Absen Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 text-center py-4">Memuat data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Absen Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{fmtDate(now, currentTimezone)}</div>
            <div className="text-lg text-gray-600">{fmtTimeOnly(now, currentTimezone)} ({timezoneLabel})</div>
          </div>
          <div className="text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor} bg-gray-100`}>
              {statusDetail}
            </span>
          </div>
        </div>

        {/* Attendance Status */}
        {!data ? (
          <div className="text-center py-6">
            <div className="text-gray-500 mb-2">Belum ada data absen hari ini</div>
            <div className="text-sm text-gray-400">Silakan lakukan check-in</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Check-in/Check-out Times */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-xs text-green-600 mb-1">Check In</div>
                <div className="text-lg font-semibold text-green-700">
                  {fmtTime(data.check_in_at_utc, data.timezone)}
                </div>
                <div className="text-xs text-green-500 mt-1">
                  {data.check_in_lat && data.check_in_lng 
                    ? (data.within_geofence === false ? 'Di luar kantor' : 'Di dalam kantor')
                    : '-'
                  }
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 mb-1">Check Out</div>
                <div className="text-lg font-semibold text-blue-700">
                  {fmtTime(data.check_out_at_utc, data.timezone)}
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  {data.check_out_lat && data.check_out_lng ? 'Di dalam kantor' : '-'}
                </div>
              </div>
            </div>

            {/* Work Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Total Kerja</div>
                  <div className="text-lg font-semibold text-gray-800">{workHours}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 mb-1">Keterlambatan</div>
                  <div className={`text-lg font-semibold ${data.minutes_late > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {data.minutes_late > 0 ? `${data.minutes_late}m` : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Note */}
            {data.employee_note?.trim() && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-700 mb-1 font-medium">Catatan</div>
                <div className="text-sm text-yellow-800">{data.employee_note}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


