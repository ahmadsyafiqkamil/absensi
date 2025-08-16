"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import Link from 'next/link';

interface Employee {
  id: number;
  nip: string;
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
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  minutes_late: number;
  total_work_minutes: number;
  is_holiday: boolean;
  within_geofence: boolean;
  note: string | null;
  employee_note: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceDetailResponse {
  employee: Employee;
  summary: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    attendance_rate: number;
    total_late_minutes: number;
    total_work_minutes: number;
    average_work_minutes: number;
  };
  attendance_records: AttendanceRecord[];
  filters: {
    start_date: string | null;
    end_date: string | null;
    month: string | null;
  };
}

export default function SupervisorAttendanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;
  
  const [attendanceData, setAttendanceData] = useState<AttendanceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    month: ''
  });

  useEffect(() => {
    if (employeeId) {
      fetchAttendanceDetail();
    }
  }, [employeeId, filters]);

  const fetchAttendanceDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.month) params.append('month', filters.month);
      
      const response = await fetch(`/api/supervisor/attendance-detail/${employeeId}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch attendance detail');
      }
      
      const data: AttendanceDetailResponse = await response.json();
      setAttendanceData(data);
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

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Dubai'
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

  const formatWorkHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Employee Attendance Detail" 
          subtitle="Detailed attendance records"
          username="Loading..."
          role="supervisor"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading attendance detail...</p>
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
          title="Employee Attendance Detail" 
          subtitle="Detailed attendance records"
          username="Error"
          role="supervisor"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Data</h3>
            <p>{error}</p>
            <Button 
              onClick={fetchAttendanceDetail}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!attendanceData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Employee Attendance Detail" 
          subtitle="Detailed attendance records"
          username="No Data"
          role="supervisor"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">No attendance data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Employee Attendance Detail" 
        subtitle="Detailed attendance records"
        username="Supervisor"
        role="supervisor"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/supervisor/attendance">
            <Button variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Team Attendance
            </Button>
          </Link>
        </div>

        {/* Employee Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {attendanceData.employee.user.first_name} {attendanceData.employee.user.last_name}
            </CardTitle>
            <CardDescription>
              NIP: {attendanceData.employee.nip} | 
              Division: {attendanceData.employee.division?.name || 'Not Assigned'} | 
              Position: {attendanceData.employee.position?.name || 'Not Assigned'}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter attendance data by date range or month</CardDescription>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Month (YYYY-MM)</label>
                <input
                  type="month"
                  value={filters.month}
                  onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{attendanceData.summary.total_days}</div>
                <div className="text-sm text-gray-600">Total Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{attendanceData.summary.present_days}</div>
                <div className="text-sm text-gray-600">Present Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{attendanceData.summary.late_days}</div>
                <div className="text-sm text-gray-600">Late Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{attendanceData.summary.attendance_rate}%</div>
                <div className="text-sm text-gray-600">Attendance Rate</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{attendanceData.summary.absent_days}</div>
                <div className="text-sm text-gray-600">Absent Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{formatWorkHours(attendanceData.summary.total_work_minutes)}</div>
                <div className="text-sm text-gray-600">Total Work Hours</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">{formatWorkHours(attendanceData.summary.average_work_minutes)}</div>
                <div className="text-sm text-gray-600">Average Work Hours</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attendance Records */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Records</h2>
          {attendanceData.attendance_records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Tanggal</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Check-in</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Check-out</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Terlambat (m)</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Jam Kerja</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Koordinat In</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Koordinat Out</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Catatan</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Dibuat</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Diubah</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.attendance_records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border-b">{formatDate(record.date_local)}</td>
                      <td className="px-3 py-2 border-b">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record)} bg-opacity-10`}>
                          {getStatusText(record)}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-b">{formatTime(record.check_in_at_utc)}</td>
                      <td className="px-3 py-2 border-b">{formatTime(record.check_out_at_utc)}</td>
                      <td className="px-3 py-2 border-b text-center">{record.minutes_late}</td>
                      <td className="px-3 py-2 border-b text-center">
                        {record.total_work_minutes > 0 ? `${Math.floor(record.total_work_minutes / 60)}h ${record.total_work_minutes % 60}m` : '-'}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {record.check_in_lat && record.check_in_lng ? `(${record.check_in_lat.toFixed(5)}, ${record.check_in_lng.toFixed(5)})` : '-'}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {record.check_out_lat && record.check_out_lng ? `(${record.check_out_lat.toFixed(5)}, ${record.check_out_lng.toFixed(5)})` : '-'}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="max-w-[320px] truncate" title={`${record.note || ''} ${record.employee_note || ''}`.trim()}>
                          {record.note || record.employee_note || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b">{formatDateTime(record.created_at)}</td>
                      <td className="px-3 py-2 border-b">{formatDateTime(record.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">No attendance records found for the selected period</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
