"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import Link from 'next/link';

interface Employee {
  id: number;
  nip: string;
  fullname: string;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  division: {
    id: number;
    name: string;
  } | null;
  position: {
    id: number;
    name: string;
  } | null;
}

interface AttendanceRecord {
  id: number;
  date_local: string;
  check_in_at_utc: string | null;
  check_out_at_utc: string | null;
  minutes_late: number;
  total_work_minutes: number;
  is_holiday: boolean;
  within_geofence: boolean;
  note: string | null;
  employee_note: string | null;
}

interface TeamAttendanceData {
  employee: Employee;
  summary: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    attendance_rate: number;
  };
  recent_attendance: AttendanceRecord[];
}

interface TeamAttendanceResponse {
  team_attendance: TeamAttendanceData[];
  filters: {
    start_date: string | null;
    end_date: string | null;
    employee_id: string | null;
    division_id: number;
  };
}

export default function SupervisorAttendancePage() {
  const [teamData, setTeamData] = useState<TeamAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    employee_id: ''
  });

  useEffect(() => {
    fetchTeamAttendance();
  }, [filters]);

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      
      const response = await fetch(`/api/supervisor/team-attendance?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch team attendance');
      }
      
      const data: TeamAttendanceResponse = await response.json();
      setTeamData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Dubai'
      });
    } catch {
      return '-';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (record: AttendanceRecord) => {
    if (record.is_holiday) return 'text-blue-600';
    if (record.minutes_late > 0) return 'text-yellow-600';
    if (record.check_in_at_utc && record.check_out_at_utc) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = (record: AttendanceRecord) => {
    if (record.is_holiday) return 'Hari Libur';
    if (record.minutes_late > 0) return `Terlambat ${record.minutes_late} menit`;
    if (record.check_in_at_utc && record.check_out_at_utc) return 'Hadir Lengkap';
    if (record.check_in_at_utc) return 'Hanya Check-in';
    return 'Tidak Hadir';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Team Attendance" 
          subtitle="Monitor your team's attendance"
          username="Loading..."
          role="supervisor"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading team attendance data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Team Attendance" 
          subtitle="Monitor your team's attendance"
          username="Error"
          role="supervisor"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Data</h3>
            <p>{error}</p>
            <Button 
              onClick={fetchTeamAttendance}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Team Attendance" 
        subtitle="Monitor your team's attendance"
        username="Supervisor"
        role="supervisor"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter attendance data by date range and employee</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID (Optional)</label>
                <input
                  type="text"
                  value={filters.employee_id}
                  onChange={(e) => setFilters(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="Filter by employee ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            {/* Reset Filter Button */}
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    start_date: '',
                    end_date: '',
                    employee_id: ''
                  });
                }}
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Overview */}
        {teamData && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{teamData?.team_attendance?.length || 0}</div>
                  <div className="text-sm text-gray-600">Team Members</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {teamData.team_attendance.reduce((sum, member) => sum + member.summary.present_days, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Present Days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {teamData.team_attendance.reduce((sum, member) => sum + member.summary.late_days, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Late Days</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {teamData?.team_attendance?.length ? Math.round(teamData.team_attendance.reduce((sum, member) => sum + member.summary.attendance_rate, 0) / teamData.team_attendance.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Attendance Rate (%)</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Download PDF Button */}
        {teamData && teamData.team_attendance && teamData.team_attendance.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={() => {
                const params = new URLSearchParams();
                if (filters.start_date) params.append('start_date', filters.start_date);
                if (filters.end_date) params.append('end_date', filters.end_date);
                if (filters.employee_id) params.append('employee_id', filters.employee_id);
                
                const url = `/api/supervisor/team-attendance/pdf?${params.toString()}`;
                window.open(url, '_blank');
              }}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Report
            </Button>
          </div>
        )}

        {/* Team Members */}
        {teamData && teamData.team_attendance && teamData.team_attendance.length > 0 ? (
          <div className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Team Attendance</CardTitle>
                <CardDescription>Ringkasan absensi per pegawai</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Nama</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">NIP</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Divisi</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Jabatan</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Total Hari</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Hadir</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Terlambat</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Rate (%)</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.team_attendance.map((member) => (
                        <tr key={member.employee.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b">
                            {member.employee.fullname || `${member.employee.user.first_name} ${member.employee.user.last_name}`}
                          </td>
                          <td className="px-3 py-2 border-b">{member.employee.nip}</td>
                          <td className="px-3 py-2 border-b">{member.employee.division?.name || '-'}</td>
                          <td className="px-3 py-2 border-b">{member.employee.position?.name || '-'}</td>
                          <td className="px-3 py-2 border-b text-center">{member.summary.total_days}</td>
                          <td className="px-3 py-2 border-b text-center text-green-700 font-medium">{member.summary.present_days}</td>
                          <td className="px-3 py-2 border-b text-center text-yellow-700 font-medium">{member.summary.late_days}</td>
                          <td className="px-3 py-2 border-b text-center text-purple-700 font-medium">{member.summary.attendance_rate}</td>
                          <td className="px-3 py-2 border-b text-center">
                            <Link href={`/supervisor/attendance-detail/${member.employee.id}`}>
                              <Button variant="outline" size="sm">Detail</Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500">
                {loading ? 'Loading...' : 'No team members found or no attendance data available'}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
