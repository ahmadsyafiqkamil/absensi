"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'
import { formatWorkHoursID } from '@/lib/utils'

type MonthlySummary = {
  month: string
  year: number
  total_days: number
  work_days: number
  holiday_days: number
  present_days: number
  absent_days: number
  late_days: number
  total_work_hours: number
  total_work_minutes: number
  average_work_hours: number
  total_late_minutes: number
  average_late_minutes: number
  on_time_days: number
  early_departure_days: number
  overtime_days: number
  attendance_rate: number
  punctuality_rate: number
}

type DailyAttendance = {
  date: string
  day_name: string
  is_holiday: boolean
  holiday_note?: string
  check_in_time?: string
  check_out_time?: string
  work_hours?: string
  is_late: boolean
  late_minutes: number
  is_early_departure: boolean
  is_overtime: boolean
  within_geofence: boolean
  employee_note?: string
  status: 'present' | 'absent' | 'holiday'
}

type AttendanceItem = {
  date_local: string
  timezone: string
  check_in_at_utc: string | null
  check_out_at_utc: string | null
  minutes_late: number
  total_work_minutes: number
  is_holiday?: boolean
  within_geofence?: boolean
  employee_note?: string | null
}

export default function MonthlySummaryPage() {
  const [me, setMe] = useState<{ username: string; groups: string[]; is_superuser: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [dailyData, setDailyData] = useState<DailyAttendance[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Initialize with current month
  useEffect(() => {
    const now = new Date()
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    setSelectedMonth(currentMonth)
    setSelectedYear(now.getFullYear())
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me')
        if (r.ok) {
          const d = await r.json()
          setMe({ username: d.username, groups: d.groups || [], is_superuser: !!d.is_superuser })
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      loadMonthlyData()
    }
  }, [selectedMonth, selectedYear])

  function getMonthStartEnd(year: number, monthNumber: number) {
    const start = new Date(year, monthNumber - 1, 1)
    const end = new Date(year, monthNumber, 0)
    const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { startISO: toISO(start), endISO: toISO(end) }
  }

  async function loadMonthlyData() {
    setLoading(true)
    setError(null)
    try {
      const monthNum = parseInt(selectedMonth)
      const { startISO, endISO } = getMonthStartEnd(selectedYear, monthNum)

      // Fetch attendance and holidays in parallel
      const [attResp, holResp] = await Promise.all([
        fetch(`/api/attendance/me?start=${startISO}&end=${endISO}`),
        // Try range first; if backend ignores range, fallback to date param
        fetch(`/api/attendance/holidays?start=${startISO}&end=${endISO}`).then(async r => r.ok ? r : fetch(`/api/attendance/holidays?date=${startISO}`)),
      ])

      const attJson = await attResp.json().catch(() => ({}))
      const attendanceList: AttendanceItem[] = Array.isArray(attJson) ? attJson : (attJson.results || [])

      const holJson = await holResp.json().catch(() => ({}))
      const holidays: { date: string; note?: string }[] = Array.isArray(holJson) ? holJson : (holJson.results || [])

      const processedData = processAttendanceData(attendanceList, holidays, selectedYear, monthNum)
      setSummary(processedData.summary)
      setDailyData(processedData.daily)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  function processAttendanceData(attendanceList: AttendanceItem[], holidays: { date: string; note?: string }[], year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate()
    const holidaySet = new Map<string, string | undefined>()
    holidays.forEach(h => holidaySet.set(h.date, h.note))

    const daily: DailyAttendance[] = []
    let totalWorkMinutes = 0
    let totalLateMinutes = 0
    let presentDays = 0
    let lateDays = 0
    let onTimeDays = 0
    let earlyDepartureDays = 0
    let overtimeDays = 0
    let holidayDays = 0

    // Map attendance by date for quick lookup
    const attByDate = new Map<string, AttendanceItem>()
    for (const a of attendanceList) attByDate.set(a.date_local, a)

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const date = new Date(dateStr)
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
      const jsDay = date.getDay()
      const isWeekend = jsDay === 0 || jsDay === 6

      const attendance = attByDate.get(dateStr)

      // Determine holiday
      const holidayNote = holidaySet.get(dateStr)
      const isHoliday = !!holidayNote || isWeekend
      if (isHoliday) holidayDays++

      if (attendance) {
        // Count as present (even if holiday, we still show presence but not count for absence)
        presentDays++
        totalWorkMinutes += attendance.total_work_minutes || 0
        totalLateMinutes += attendance.minutes_late || 0
        if (attendance.minutes_late > 0) lateDays++
        else onTimeDays++
        if (attendance.total_work_minutes < 480) earlyDepartureDays++
        if (attendance.total_work_minutes > 480) overtimeDays++

        daily.push({
          date: dateStr,
          day_name: dayName,
          is_holiday: isHoliday,
          holiday_note: holidayNote || (isWeekend ? 'Libur Akhir Pekan' : undefined),
          check_in_time: attendance.check_in_at_utc ? formatTime(attendance.check_in_at_utc, attendance.timezone) : undefined,
          check_out_time: attendance.check_out_at_utc ? formatTime(attendance.check_out_at_utc, attendance.timezone) : undefined,
          work_hours: formatWorkHoursID(attendance.total_work_minutes),
          is_late: attendance.minutes_late > 0,
          late_minutes: attendance.minutes_late || 0,
          is_early_departure: attendance.total_work_minutes < 480,
          is_overtime: attendance.total_work_minutes > 480,
          within_geofence: !!attendance.within_geofence,
          employee_note: attendance.employee_note || undefined,
          status: 'present',
        })
      } else if (isHoliday) {
        daily.push({
          date: dateStr,
          day_name: dayName,
          is_holiday: true,
          holiday_note: holidayNote || 'Libur Akhir Pekan',
          is_late: false,
          late_minutes: 0,
          is_early_departure: false,
          is_overtime: false,
          within_geofence: false,
          status: 'holiday',
        })
      } else {
        daily.push({
          date: dateStr,
          day_name: dayName,
          is_holiday: false,
          is_late: false,
          late_minutes: 0,
          is_early_departure: false,
          is_overtime: false,
          within_geofence: false,
          status: 'absent',
        })
      }
    }

    // Work days = total - holiday days
    const workDays = daysInMonth - holidayDays
    const absentDays = workDays - presentDays
    const averageWorkHours = presentDays > 0 ? totalWorkMinutes / presentDays / 60 : 0
    const averageLateMinutes = lateDays > 0 ? totalLateMinutes / lateDays : 0
    const attendanceRate = workDays > 0 ? (presentDays / workDays) * 100 : 0
    const punctualityRate = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0

    const summary: MonthlySummary = {
      month: new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'long' }),
      year,
      total_days: daysInMonth,
      work_days: workDays,
      holiday_days: holidayDays,
      present_days: presentDays,
      absent_days: absentDays < 0 ? 0 : absentDays,
      late_days: lateDays,
      total_work_hours: totalWorkMinutes / 60,
      total_work_minutes: totalWorkMinutes,
      average_work_hours: averageWorkHours,
      total_late_minutes: totalLateMinutes,
      average_late_minutes: averageLateMinutes,
      on_time_days: onTimeDays,
      early_departure_days: earlyDepartureDays,
      overtime_days: overtimeDays,
      attendance_rate: attendanceRate,
      punctuality_rate: punctualityRate,
    }

    return { summary, daily }
  }

  function formatTime(isoString: string, timezone: string): string {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: timezone || 'Asia/Dubai' })
    } catch {
      return '-'
    }
  }



  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }

  const role = me?.is_superuser ? 'admin' : (me?.groups?.includes('admin') ? 'admin' : (me?.groups?.includes('supervisor') ? 'supervisor' : 'pegawai'))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Summary Bulanan" subtitle="Ringkasan absensi bulanan Anda" username={me?.username || ''} role={role} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Month Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pilih Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border rounded p-2"
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <input 
                type="number" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border rounded p-2 w-24"
                min="2020"
                max="2030"
              />
              <Button onClick={loadMonthlyData} disabled={loading}>
                {loading ? 'Memuat...' : 'Refresh'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* Monthly Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Kehadiran</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{summary.present_days}</div>
                  <div className="text-sm text-gray-500">dari {summary.work_days} hari kerja</div>
                  <div className="text-xs text-gray-400 mt-1">{formatPercentage(summary.attendance_rate)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Total Jam Kerja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summary.total_work_hours.toFixed(1)}j</div>
                  <div className="text-sm text-gray-500">Rata-rata {summary.average_work_hours.toFixed(1)}j/hari</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Keterlambatan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{summary.late_days}</div>
                  <div className="text-sm text-gray-500">Total {summary.total_late_minutes}m</div>
                  <div className="text-xs text-gray-400 mt-1">Rata-rata {summary.average_late_minutes.toFixed(0)}m</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Ketepatan Waktu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{summary.on_time_days}</div>
                  <div className="text-sm text-gray-500">dari {summary.present_days} hari hadir</div>
                  <div className="text-xs text-gray-400 mt-1">{formatPercentage(summary.punctuality_rate)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistik Tambahan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hari Libur:</span>
                    <span className="font-medium">{summary.holiday_days} hari</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pulang Awal:</span>
                    <span className="font-medium text-orange-600">{summary.early_departure_days} hari</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lembur:</span>
                    <span className="font-medium text-green-600">{summary.overtime_days} hari</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ringkasan Bulan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bulan:</span>
                    <span className="font-medium">{summary.month} {summary.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Hari:</span>
                    <span className="font-medium">{summary.total_days} hari</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hari Kerja:</span>
                    <span className="font-medium">{summary.work_days} hari</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tingkat Kehadiran:</span>
                    <span className={`font-medium ${summary.attendance_rate >= 90 ? 'text-green-600' : summary.attendance_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatPercentage(summary.attendance_rate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ketepatan Waktu:</span>
                    <span className={`font-medium ${summary.punctuality_rate >= 90 ? 'text-green-600' : summary.punctuality_rate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {formatPercentage(summary.punctuality_rate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Daily Calendar View */}
            <Card>
              <CardHeader>
                <CardTitle>Kalender Harian - {summary.month} {summary.year}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {/* Day headers */}
                  {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
                    <div key={day} className="p-2 text-center font-medium bg-gray-100 rounded">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {dailyData.map((day, index) => {
                    let bgColor = 'bg-white'
                    let textColor = 'text-gray-900'
                    
                    if (day.is_holiday) {
                      bgColor = 'bg-blue-100'
                      textColor = 'text-blue-700'
                    } else if (day.status === 'absent') {
                      bgColor = 'bg-red-100'
                      textColor = 'text-red-700'
                    } else if (day.is_late) {
                      bgColor = 'bg-orange-100'
                      textColor = 'text-orange-700'
                    } else if (day.status === 'present') {
                      bgColor = 'bg-green-100'
                      textColor = 'text-green-700'
                    }

                    return (
                      <div 
                        key={index} 
                        className={`p-2 border rounded min-h-[80px] ${bgColor} ${textColor}`}
                        title={`${day.date} - ${day.day_name}${day.holiday_note ? ` (${day.holiday_note})` : ''}`}
                      >
                        <div className="text-center font-medium mb-1">{new Date(day.date).getDate()}</div>
                        {day.status === 'present' && (
                          <div className="space-y-1 text-xs">
                            <div>In: {day.check_in_time || '-'}</div>
                            <div>Out: {day.check_out_time || '-'}</div>
                            <div>Kerja: {day.work_hours || '-'}</div>
                            {day.is_late && <div className="text-orange-600">+{day.late_minutes}m</div>}
                          </div>
                        )}
                        {day.is_holiday && (
                          <div className="text-center text-xs">
                            {day.holiday_note}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
