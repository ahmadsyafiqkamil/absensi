"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import Link from 'next/link';
import { formatWorkHoursEN } from '@/lib/utils';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";

interface AttendanceRecord {
  id: number;
  date_local: string;
  check_in_at_utc: string | null;
  check_out_at_utc: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_in_ip?: string | null;
  check_out_ip?: string | null;
  minutes_late: number;
  total_work_minutes: number;
  is_holiday: boolean;
  within_geofence: boolean;
  note: string | null;
  employee_note: string | null;
  created_at: string;
  updated_at: string;
}

interface AttendanceReportResponse {
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

export default function PegawaiAttendanceReportPage() {
  const [attendanceData, setAttendanceData] = useState<AttendanceReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    month: ''
  });

  useEffect(() => {
    fetchAttendanceReport();
  }, [filters]);

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.month) params.append('month', filters.month);
      
      const response = await fetch(`/api/attendance/report?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch attendance report');
      }
      
      const data: AttendanceReportResponse = await response.json();
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

  // WFA/WFO status: gunakan within_geofence saat check-in sebagai indikator
  const getWfaWfo = (record: AttendanceRecord) => {
    if (!record.check_in_at_utc) return '-';
    return record.within_geofence ? 'WFO' : 'WFA';
  };

  // TanStack Table columns
  const columns: ColumnDef<AttendanceRecord>[] = [
    { header: 'Tanggal', accessorKey: 'date_local', cell: ({ row }) => formatDate(row.original.date_local) },
    { header: 'Status', id: 'status', cell: ({ row }) => (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(row.original)} bg-opacity-10`}>
        {getStatusText(row.original)}
      </span>
    ) },
    { header: 'WFA/WFO', id: 'wfa_wfo', cell: ({ row }) => getWfaWfo(row.original) },
    { header: 'Check-in', id: 'check_in', cell: ({ row }) => formatTime(row.original.check_in_at_utc) },
    { header: 'Check-out', id: 'check_out', cell: ({ row }) => formatTime(row.original.check_out_at_utc) },
    { header: 'Terlambat (m)', accessorKey: 'minutes_late', cell: ({ getValue }) => <span className="block text-center">{String(getValue<number>())}</span> },
    { header: 'Jam Kerja', id: 'work_minutes', cell: ({ row }) => (
      <span className="block text-center">{row.original.total_work_minutes > 0 ? `${Math.floor(row.original.total_work_minutes / 60)}h ${row.original.total_work_minutes % 60}m` : '-'}</span>
    ) },
    { header: 'Koordinat In', id: 'coord_in', cell: ({ row }) => (
      row.original.check_in_lat && row.original.check_in_lng ? `(${row.original.check_in_lat.toFixed(5)}, ${row.original.check_in_lng.toFixed(5)})` : '-'
    ) },
    { header: 'Koordinat Out', id: 'coord_out', cell: ({ row }) => (
      row.original.check_out_lat && row.original.check_out_lng ? `(${row.original.check_out_lat.toFixed(5)}, ${row.original.check_out_lng.toFixed(5)})` : '-'
    ) },
    { header: 'IP In', id: 'ip_in', cell: ({ row }) => row.original.check_in_ip || '-' },
    { header: 'IP Out', id: 'ip_out', cell: ({ row }) => row.original.check_out_ip || '-' },
    { header: 'Catatan', id: 'notes', cell: ({ row }) => (
      <div className="max-w-[320px] truncate" title={`${row.original.note || ''} ${row.original.employee_note || ''}`.trim()}>
        {row.original.note || row.original.employee_note || '-'}
      </div>
    ) },
    { header: 'Dibuat', id: 'created', cell: ({ row }) => formatDateTime(row.original.created_at) },
    { header: 'Diubah', id: 'updated', cell: ({ row }) => formatDateTime(row.original.updated_at) },
  ];



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Attendance Report" 
          subtitle="Your attendance records and statistics"
          username="Loading..."
          role="pegawai"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading attendance report...</p>
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
          title="Attendance Report" 
          subtitle="Your attendance records and statistics"
          username="Error"
          role="pegawai"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Data</h3>
            <p>{error}</p>
            <Button 
              onClick={fetchAttendanceReport}
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
          title="Attendance Report" 
          subtitle="Your attendance records and statistics"
          username="No Data"
          role="pegawai"
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
        title="Attendance Report" 
        subtitle="Your attendance records and statistics"
        username="Pegawai"
        role="pegawai"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/pegawai">
            <Button variant="outline" className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Employee Dashboard
            </Button>
          </Link>
        </div>

        {/* Download PDF Button */}
        {attendanceData && (
          <div className="mb-6 flex justify-end">
            <Button 
              onClick={() => {
                const params = new URLSearchParams();
                if (filters.start_date) params.append('start_date', filters.start_date);
                if (filters.end_date) params.append('end_date', filters.end_date);
                if (filters.month) params.append('month', filters.month);
                
                const url = `/api/attendance/report/pdf?${params.toString()}`;
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
            
            {/* Reset Filter Button */}
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    start_date: '',
                    end_date: '',
                    month: ''
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
                <div className="text-2xl font-bold text-orange-600">{formatWorkHoursEN(attendanceData.summary.total_work_minutes)}</div>
                <div className="text-sm text-gray-600">Total Work Hours</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">{formatWorkHoursEN(attendanceData.summary.average_work_minutes)}</div>
                <div className="text-sm text-gray-600">Average Work Hours</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attendance Records (TanStack Table) */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Records</h2>
          {attendanceData.attendance_records.length > 0 ? (
            <TanstackTable data={attendanceData.attendance_records} columns={columns} />
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

function TanstackTable({ data, columns }: { data: AttendanceRecord[]; columns: ColumnDef<AttendanceRecord>[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="overflow-x-auto bg-white border rounded-md">
      <div className="p-3 grid gap-2 md:grid-cols-4 grid-cols-1 border-b bg-gray-50">
        <input
          placeholder="Filter Tanggal (YYYY-MM-DD)"
          value={(table.getColumn('date_local')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('date_local')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter Status (WFA/WFO)"
          value={(table.getColumn('wfa_wfo')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('wfa_wfo')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter IP In"
          value={(table.getColumn('ip_in')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('ip_in')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter IP Out"
          value={(table.getColumn('ip_out')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('ip_out')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && <span>▲</span>}
                    {header.column.getIsSorted() === "desc" && <span>▼</span>}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                No attendance records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
