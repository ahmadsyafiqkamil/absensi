"use client";

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Header from '@/components/Header'
import { formatWorkHoursID } from '@/lib/utils'
import Link from 'next/link'

type MonthlySummary = {
  present_days: number
  work_days: number
  attendance_rate: number
  total_work_hours: number
  average_work_hours: number
  late_days: number
  total_late_minutes: number
  average_late_minutes: number
  total_work_minutes: number
  average_work_minutes: number
}

type AttendanceRecord = {
  id: number
  date_local: string
  timezone: string
  check_in_at_utc: string | null
  check_out_at_utc: string | null
  minutes_late: number
  total_work_minutes: number
  is_holiday: boolean
  within_geofence: boolean
  employee_note: string | null
}

export default function SupervisorMonthlySummaryPage() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('01')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadMonthlyData()
  }, [selectedMonth, selectedYear])

  const loadMonthlyData = async () => {
    try {
      setLoading(true)
      setError(null)

      const monthStr = `${selectedYear}-${selectedMonth}`
      const response = await fetch(`/api/attendance/report?month=${monthStr}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to load monthly data')
      }

      const data = await response.json()
      
      // Calculate summary from attendance records
      const records = data.attendance_records || []
      const workDays = records.length
      const presentDays = records.filter((r: any) => r.check_in_at_utc).length
      const lateDays = records.filter((r: any) => r.minutes_late > 0).length
      const totalWorkMinutes = records.reduce((sum: number, r: any) => sum + (r.total_work_minutes || 0), 0)
      const totalLateMinutes = records.reduce((sum: number, r: any) => sum + (r.minutes_late || 0), 0)

      const monthlySummary: MonthlySummary = {
        present_days: presentDays,
        work_days: workDays,
        attendance_rate: workDays > 0 ? Math.round((presentDays / workDays) * 100) : 0,
        total_work_hours: totalWorkMinutes / 60,
        average_work_hours: presentDays > 0 ? totalWorkMinutes / presentDays / 60 : 0,
        late_days: lateDays,
        total_late_minutes: totalLateMinutes,
        average_late_minutes: lateDays > 0 ? totalLateMinutes / lateDays : 0,
        total_work_minutes: totalWorkMinutes,
        average_work_minutes: presentDays > 0 ? totalWorkMinutes / presentDays : 0
      }

      setSummary(monthlySummary)
      setAttendanceRecords(records)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function formatTime(timeString: string | null, timezone: string) {
    if (!timeString) return '-'
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit', 
        timeZone: timezone || 'Asia/Dubai' 
      })
    } catch {
      return '-'
    }
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Monthly Summary" subtitle="Ringkasan absensi bulanan Anda" username="Loading..." role="supervisor" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading monthly data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Monthly Summary" subtitle="Ringkasan absensi bulanan Anda" username="Error" role="supervisor" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Data</h3>
            <p>{error}</p>
            <Button onClick={loadMonthlyData} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Monthly Summary" subtitle="Ringkasan absensi bulanan Anda" username="Supervisor" role="supervisor" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/supervisor">
            <Button variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Supervisor Dashboard
            </Button>
          </Link>
        </div>

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
                  <CardTitle className="text-sm text-gray-600">Efisiensi Kerja</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {summary.work_days > 0 ? Math.round((summary.present_days / summary.work_days) * 100) : 0}%
                  </div>
                  <div className="text-sm text-gray-500">Tingkat kehadiran</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Work Hours Summary */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Ringkasan Jam Kerja Detail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{formatWorkHoursID(summary.total_work_minutes)}</div>
                    <div className="text-sm text-gray-600">Total Jam Kerja</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{formatWorkHoursID(summary.average_work_minutes)}</div>
                    <div className="text-sm text-gray-600">Rata-rata per Hari</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{summary.total_late_minutes}m</div>
                    <div className="text-sm text-gray-600">Total Keterlambatan</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Attendance Records Table */}
        {attendanceRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detail Absensi Bulanan</CardTitle>
              <CardDescription>Record absensi untuk bulan {selectedMonth}/{selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Tanggal</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Check-in</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Check-out</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Jam Kerja</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Keterlambatan</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((attendance) => {
                      const work_hours = formatWorkHoursID(attendance.total_work_minutes)
                      const is_late = attendance.minutes_late > 0
                      const late_minutes = attendance.minutes_late || 0
                      const status = attendance.is_holiday ? 'Hari Libur' : 
                                   (attendance.check_in_at_utc ? 'Hadir' : 'Tidak Hadir')
                      
                      return (
                        <tr key={attendance.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">{formatDate(attendance.date_local)}</td>
                          <td className="px-3 py-2 border-b">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              attendance.is_holiday ? 'text-blue-600 bg-blue-100' :
                              attendance.check_in_at_utc ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-3 py-2 border-b">{formatTime(attendance.check_in_at_utc, attendance.timezone)}</td>
                          <td className="px-3 py-2 border-b">{formatTime(attendance.check_out_at_utc, attendance.timezone)}</td>
                          <td className="px-3 py-2 border-b text-center">{work_hours}</td>
                          <td className="px-3 py-2 border-b text-center">
                            {is_late ? (
                              <span className="text-red-600 font-medium">{late_minutes}m</span>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b">
                            {attendance.employee_note || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {attendanceRecords.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">Tidak ada data absensi untuk bulan yang dipilih</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
