import { meFromServerCookies } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Header from '@/components/Header';
import TodayAttendance from '../pegawai/TodayAttendance';
import AttendanceWidget from '../pegawai/AttendanceWidget';
import MultiPositionSummary from '@/components/MultiPositionSummary';
import { getApprovalCapabilitiesEnhanced, getMultiPositionApprovalInfo } from '@/lib/approval-utils';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function SupervisorPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
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

  // Use enhanced multi-position approval capabilities
  const approvalCapabilities = getApprovalCapabilitiesEnhanced(me)
  const multiPositionInfo = getMultiPositionApprovalInfo(me)
  const hasApprovalPermission = approvalCapabilities.division_level || approvalCapabilities.organization_level

  if (!hasApprovalPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Supervisor privileges required (approval level 1 or higher).</p>
          <div className="text-sm text-gray-500 mt-2 space-y-1">
            <p>Current approval level: {multiPositionInfo.highest_approval_level}</p>
            <p>Positions: {multiPositionInfo.total_positions}</p>
            {multiPositionInfo.position_summary.map((summary, index) => (
              <p key={index}>• {summary}</p>
            ))}
          </div>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header 
        title="Supervisor Dashboard" 
        subtitle="Manage your team and monitor performance"
        username={me.username}
        role="supervisor"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Position Information
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Position Information</h2>
          <MultiPositionSummary user={me} />
        </div> */}

        {/* Your Attendance (Supervisor can also check-in/out) */}
        <div className="grid gap-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Your Attendance</h2>
          <TodayAttendance />
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Attendance Actions
              </CardTitle>
              <CardDescription>Record your own attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AttendanceWidget />
            </CardContent>
          </Card>
        </div>

        {/* Supervisor Functions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Team Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Team Management
              </CardTitle>
              <CardDescription>Manage your team members and assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/supervisor/team">
                <Button className="w-full">View Team</Button>
              </Link>
              <Link href="/supervisor/assignments">
                <Button variant="outline" className="w-full">Assign Tasks</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Attendance Monitoring */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Attendance Monitoring
              </CardTitle>
              <CardDescription>Monitor team attendance and approve requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/supervisor/attendance">
                <Button className="w-full">View Attendance</Button>
              </Link>
              <Link href="/supervisor/approvals">
                <Button variant="outline" className="w-full">Pending Approvals</Button>
              </Link>
              <Link href="/supervisor/overtime-requests">
                <Button variant="outline" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Persetujuan Lembur
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Performance Reports */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Performance Reports
              </CardTitle>
              <CardDescription>Generate and view team performance reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/supervisor/reports">
                <Button className="w-full">View Reports</Button>
              </Link>
              <Link href="/supervisor/monthly-summary">
                <Button variant="outline" className="w-full">Monthly Summary</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Communication
              </CardTitle>
              <CardDescription>Team announcements and messaging</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/supervisor/announcements">
                <Button className="w-full">Send Announcement</Button>
              </Link>
              <Link href="/supervisor/messages">
                <Button variant="outline" className="w-full">Team Messages</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </CardTitle>
              <CardDescription>Configure supervisor preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/supervisor/settings">
                <Button variant="outline" className="w-full">Preferences</Button>
              </Link>
              <Link href="/supervisor/profile">
                <Button variant="outline" className="w-full">Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Present Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">0</div>
                <div className="text-sm text-gray-600">Pending Approvals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Active Tasks</div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
