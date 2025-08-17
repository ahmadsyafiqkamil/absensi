"use client";

import { useEffect, useMemo, useState, useCallback } from 'react'
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
  const [currentDate, setCurrentDate] = useState<string>('')

  function toISODate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Function to fetch today's attendance data
  const fetchTodayData = useCallback(async (targetDate: string) => {
    setLoading(true)
    const q = `?start=${targetDate}&end=${targetDate}`
    
    try {
      const [attResp, holResp, settingsResp] = await Promise.all([
        fetch('/api/attendance/me?page=1&page_size=1'),
        fetch(`/api/attendance/holidays/${q}`),
        fetch('/api/settings/work'),
      ])
      
      const d = await attResp.json().catch(() => ({}))
      const att = Array.isArray(d) ? (d[0] || null) : (d?.results?.[0] || null)
      
      // Only set data if it's for the current date
      if (att && att.date_local === targetDate) {
        setData(att)
      } else {
        setData(null)
      }

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
  }, [])

  // Initial data fetch
  useEffect(() => {
    const today = toISODate(new Date())
    setCurrentDate(today)
    fetchTodayData(today)
  }, [fetchTodayData])

  // Listen for attendance refresh events (from check-in/check-out)
  useEffect(() => {
    const handleAttendanceRefresh = () => {
      console.log('Attendance refresh event received, refreshing data...')
      const today = toISODate(new Date())
      fetchTodayData(today)
    }

    window.addEventListener('attendance-refresh', handleAttendanceRefresh)
    return () => window.removeEventListener('attendance-refresh', handleAttendanceRefresh)
  }, [fetchTodayData])

  // Update current time every second and check for date changes
  useEffect(() => {
    const tick = setInterval(() => {
      const newNow = new Date()
      setNow(newNow)
      
      // Check if date has changed
      const newDate = toISODate(newNow)
      if (newDate !== currentDate) {
        console.log('Date changed, resetting attendance data')
        setCurrentDate(newDate)
        setData(null) // Reset attendance data immediately
        setIsHoliday(false) // Reset holiday status
        fetchTodayData(newDate) // Fetch new day's data
      }
    }, 1000)
    
    return () => clearInterval(tick)
  }, [currentDate, fetchTodayData])

  // Calculate time until next midnight in the work timezone
  useEffect(() => {
    if (!workSettings?.timezone) return
    
    const calculateNextMidnight = () => {
      const nowDate = new Date()
      const tz = workSettings.timezone || 'Asia/Dubai'
      
      // Get current time in the work timezone
      const tzDate = new Date(nowDate.toLocaleString("en-US", {timeZone: tz}))
      
      // Calculate next midnight in that timezone
      const nextMidnight = new Date(tzDate)
      nextMidnight.setHours(24, 0, 0, 0)
      
      // Convert back to local time for setTimeout
      const localMidnight = new Date(nextMidnight.toLocaleString("en-US", {timeZone: tz}))
      const ms = localMidnight.getTime() - nowDate.getTime()
      
      return Math.max(ms, 1000) // Ensure at least 1 second
    }

    const scheduleNextReset = () => {
      const ms = calculateNextMidnight()
      const t = setTimeout(() => {
        console.log('Scheduled reset triggered')
        const newDate = toISODate(new Date())
        setCurrentDate(newDate)
        setData(null)
        setIsHoliday(false)
        fetchTodayData(newDate)
        scheduleNextReset() // Schedule next reset
      }, ms)
      
      return () => clearTimeout(t)
    }

    const cleanup = scheduleNextReset()
    return cleanup
  }, [workSettings?.timezone, fetchTodayData])

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


