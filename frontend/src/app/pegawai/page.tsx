import { meFromServerCookies } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Header from '@/components/Header';
import AttendanceWidget from './AttendanceWidget'
import TodayAttendance from './TodayAttendance'
import PegawaiCalendar from './PegawaiCalendar'
import OvertimeSummary from './OvertimeSummary'

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function PegawaiPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You are not authorized to view this page.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Employee Dashboard" 
        subtitle="Manage your attendance and profile"
        username={me.username}
        role="pegawai"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="mb-8 grid gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Your Overview</h2>
          <TodayAttendance />
        </div>

        {/* Employee Functions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Attendance */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Attendance
              </CardTitle>
              <CardDescription>Record your daily attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AttendanceWidget />
              <Link href="/pegawai/corrections">
                <Button variant="outline" className="w-full">Ajukan Perbaikan Absensi</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Profile */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </CardTitle>
              <CardDescription>Manage your profile and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/pegawai/profile">
                <Button className="w-full">View Profile</Button>
              </Link>
              <Link href="/pegawai/settings">
                <Button variant="outline" className="w-full">Settings</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Leave Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Leave Management
              </CardTitle>
              <CardDescription>Request and manage your leave</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/pegawai/leave-request">
                <Button className="w-full">Request Leave</Button>
              </Link>
              <Link href="/pegawai/leave-history">
                <Button variant="outline" className="w-full">Leave History</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </CardTitle>
              <CardDescription>View your attendance reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/pegawai/attendance-report">
                <Button variant="outline" className="w-full">Attendance Report</Button>
              </Link>
              <Link href="/pegawai/overtime">
                <Button variant="outline" className="w-full">Overtime Management</Button>
              </Link>
              {/* <Link href="/pegawai/monthly-summary">
                <Button variant="outline" className="w-full">Monthly Summary</Button>
              </Link> */}
            </CardContent>
          </Card>
        </div>

        {/* Calendar Attendance */}
        <div className="mt-8 grid gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Kalender Kehadiran</h2>
          <PegawaiCalendar />
        </div>

        {/* Overtime Summary */}
        <div className="mt-8 grid gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Overtime Summary</h2>
          <OvertimeSummary />
        </div>

      </div>
    </div>
  );
}
