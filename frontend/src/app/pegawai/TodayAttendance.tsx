"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
  note?: string | null
  overtime_minutes?: number
  overtime_amount?: number
  overtime_approved?: boolean
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
      const [overtimeData, setOvertimeData] = useState<any>(null)
      
      // Ref to track if midnight reset is already scheduled
      const midnightResetScheduled = useRef<boolean>(false)
      const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function toISODate(d: Date, timezone?: string) {
    if (timezone) {
      try {
        const tzDate = new Date(d.toLocaleString('en-US', { timeZone: timezone }))
        return `${tzDate.getFullYear()}-${String(tzDate.getMonth() + 1).padStart(2, '0')}-${String(tzDate.getDate()).padStart(2, '0')}`
      } catch {
        // fallback below
      }
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // Function to fetch today's attendance data
  const fetchTodayData = useCallback(async (targetDate: string) => {
    setLoading(true)
    const q = `?start=${targetDate}&end=${targetDate}`
    
    try {
      const [attResp, holResp, settingsResp, overtimeResp] = await Promise.all([
        fetch(`/api/attendance/me${q}&page=1&page_size=1`),
        fetch(`/api/attendance/holidays/${q}`),
        fetch('/api/employee/settings/work'),
        fetch(`/api/overtime/report?start_date=${targetDate}&end_date=${targetDate}`),
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
      const holItems = Array.isArray(holD) ? holD : (holD?.results || [])
      const isHolidayToday = Array.isArray(holItems) && holItems.some((h: any) => (h?.date || h?.date_local) === targetDate)
      setIsHoliday(isHolidayToday)

      // Fetch overtime data for today
      try {
        const overtimeD = await overtimeResp.json().catch(() => ({}))
        if (overtimeD.overtime_records && overtimeD.overtime_records.length > 0) {
          const todayOvertime = overtimeD.overtime_records[0];
          setOvertimeData(todayOvertime);
        } else {
          setOvertimeData(null);
        }
      } catch (error) {
        console.error('Error fetching overtime data:', error);
        setOvertimeData(null);
      }

      const settingsData = await settingsResp.json().catch(() => ({}))
      if (settingsResp.ok && settingsData) {
        setWorkSettings(settingsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    const tz = workSettings?.timezone || 'Asia/Dubai'
    const today = toISODate(new Date(), tz)
    setCurrentDate(today)
    fetchTodayData(today)
  }, [fetchTodayData, workSettings?.timezone])

  // Listen for attendance refresh events (from check-in/check-out)
  useEffect(() => {
    const handleAttendanceRefresh = () => {
      console.log('Attendance refresh event received, refreshing data...')
      const tz = workSettings?.timezone || 'Asia/Dubai'
      const today = toISODate(new Date(), tz)
      fetchTodayData(today)
    }

    window.addEventListener('attendance-refresh', handleAttendanceRefresh)
    return () => window.removeEventListener('attendance-refresh', handleAttendanceRefresh)
  }, [fetchTodayData, workSettings?.timezone])

  // Update current time every second and check for date changes
  useEffect(() => {
    const tick = setInterval(() => {
      const newNow = new Date()
      setNow(newNow)
      
      // Check if date has changed
      const tz = workSettings?.timezone || 'Asia/Dubai'
      const newDate = toISODate(newNow, tz)
      if (newDate !== currentDate) {
        console.log('Date changed, resetting attendance data')
        setCurrentDate(newDate)
        setData(null) // Reset attendance data immediately
        setIsHoliday(false) // Reset holiday status
        fetchTodayData(newDate) // Fetch new day's data
      }
    }, 1000)
    
    return () => clearInterval(tick)
  }, [currentDate, fetchTodayData, workSettings?.timezone])

  // Schedule reset at midnight in the work timezone (only once per timezone change)
  useEffect(() => {
    if (!workSettings?.timezone) return
    
    // Clear any existing timeout first
    if (midnightTimeoutRef.current) {
      clearTimeout(midnightTimeoutRef.current)
      midnightTimeoutRef.current = null
    }
    
    // Reset the scheduled flag
    midnightResetScheduled.current = false
    
    const calculateNextMidnight = () => {
      const nowDate = new Date()
      const tz = workSettings.timezone || 'Asia/Dubai'
      
      // Get current time in the target timezone
      const nowInTz = new Date(nowDate.toLocaleString("en-US", {timeZone: tz}))
      
      // Calculate next midnight in the target timezone
      const nextMidnight = new Date(nowInTz)
      nextMidnight.setHours(0, 0, 0, 0) // Set to midnight
      nextMidnight.setDate(nextMidnight.getDate() + 1) // Next day
      
      // Convert the midnight time back to local time for setTimeout
      const localMidnight = new Date(nextMidnight.toLocaleString("en-US", {timeZone: tz}))
      const ms = localMidnight.getTime() - nowDate.getTime()
      
      return Math.max(ms, 1000) // Ensure at least 1 second
    }

    const ms = calculateNextMidnight()
    console.log(`Scheduling reset in ${Math.round(ms / 1000 / 60)} minutes for timezone ${workSettings.timezone}`)
    
    midnightResetScheduled.current = true
    midnightTimeoutRef.current = setTimeout(() => {
      console.log('Scheduled reset triggered at midnight')
      midnightResetScheduled.current = false
      // Force a page reload to get fresh data for the new day
      window.location.reload()
    }, ms)
    
    return () => {
      console.log('Clearing midnight reset timeout')
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current)
        midnightTimeoutRef.current = null
      }
      midnightResetScheduled.current = false
    }
  }, [workSettings?.timezone])

  const workHours = useMemo(() => {
    if (!data || !data.total_work_minutes) return '-'
    const h = Math.floor(data.total_work_minutes / 60)
    const m = data.total_work_minutes % 60
    return `${h}j ${m}m`
  }, [data])

  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: (workSettings?.timezone || 'Asia/Dubai') }))
  const jsDay = tzNow.getDay() // 0=Min..6=Sab
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
                <div className="text-xs mt-1">
                  {data.check_in_lat && data.check_in_lng 
                    ? (
                      <span className={data.within_geofence === false ? 'text-orange-600' : 'text-green-600'}>
                        {data.within_geofence === false ? '⚠️ Di luar kantor' : '✅ Di dalam kantor'}
                      </span>
                    )
                    : '-'
                  }
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-600 mb-1">Check Out</div>
                <div className="text-lg font-semibold text-blue-700">
                  {fmtTime(data.check_out_at_utc, data.timezone)}
                </div>
                <div className="text-xs mt-1">
                  {data.check_out_lat && data.check_out_lng 
                    ? (
                      <span className={data.within_geofence === false ? 'text-orange-600' : 'text-green-600'}>
                        {data.within_geofence === false ? '⚠️ Di luar kantor' : '✅ Di dalam kantor'}
                      </span>
                    )
                    : '-'
                  }
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

            {/* Overtime Information */}
            {overtimeData && overtimeData.overtime_minutes > 0 && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-xs text-orange-700 mb-1 font-medium">Overtime</div>
                    <div className="text-lg font-semibold text-orange-800">
                      {Math.floor(overtimeData.overtime_minutes / 60)}j {overtimeData.overtime_minutes % 60}m
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-orange-700 mb-1 font-medium">Status</div>
                    <div className={`text-sm font-medium ${
                      overtimeData.overtime_approved ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {overtimeData.overtime_approved ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                </div>
                {overtimeData.overtime_amount && overtimeData.overtime_amount > 0 && (
                  <div className="mt-2 text-center">
                    <div className="text-xs text-orange-600 mb-1">Gaji Overtime</div>
                    <div className="text-sm font-semibold text-orange-800">
                      {new Intl.NumberFormat('en-AE', {
                        style: 'currency',
                        currency: 'AED',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(overtimeData.overtime_amount)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Employee Note */}
            {data.employee_note?.trim() && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-700 mb-1 font-medium">Catatan</div>
                <div className="text-sm text-yellow-800">{data.employee_note}</div>
              </div>
            )}
            
            {/* System Note (Geofence Warning) */}
            {data.note?.trim() && (
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="text-xs text-orange-700 mb-1 font-medium">⚠️ Peringatan Sistem</div>
                <div className="text-sm text-orange-800">{data.note}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


