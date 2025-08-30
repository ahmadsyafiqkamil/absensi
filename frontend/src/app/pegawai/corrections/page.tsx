"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from '@/components/Header';
import Link from 'next/link';
import { authFetch } from '@/lib/authFetch';
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

interface CorrectionRecord {
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
  correction_status: 'pending' | 'approved' | 'rejected' | null;
}

interface CorrectionsResponse {
  correction_records: CorrectionRecord[];
  summary: {
    total_records: number;
    wfa_records: number;
    missing_attendance: number;
    pending_corrections: number;
  };
}

export default function PegawaiCorrectionsPage() {
  const [correctionsData, setCorrectionsData] = useState<CorrectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    month: '',
    status: 'all'
  });

  useEffect(() => {
    fetchCorrectionsData();
  }, [filters]);

  const fetchCorrectionsData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams();
      
      // Priority: month filter overrides date range filters
      if (filters.month) {
        params.append('month', filters.month);
      } else {
        // Only use date range if month is not set
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
      }
      
      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      
      const response = await authFetch(`/api/attendance/corrections?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch corrections data');
      }
      
      const data: CorrectionsResponse = await response.json();
      setCorrectionsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
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

  const getAttendanceStatus = (record: CorrectionRecord) => {
    if (record.is_holiday) return { text: 'Hari Libur', color: 'text-blue-600 bg-blue-100' };
    if (!record.check_in_at_utc && !record.check_out_at_utc) return { text: 'Tidak Hadir', color: 'text-red-600 bg-red-100' };
    if (record.check_in_at_utc && !record.check_out_at_utc) return { text: 'Hanya Check-in', color: 'text-yellow-600 bg-yellow-100' };
    if (!record.check_in_at_utc && record.check_out_at_utc) return { text: 'Hanya Check-out', color: 'text-yellow-600 bg-yellow-100' };
    if (record.minutes_late > 0) return { text: `Terlambat ${record.minutes_late}m`, color: 'text-orange-600 bg-orange-100' };
    return { text: 'Hadir Lengkap', color: 'text-green-600 bg-green-100' };
  };

  const getWfaWfoStatus = (record: CorrectionRecord) => {
    if (!record.check_in_at_utc) return { text: '-', color: 'text-gray-500' };
    const status = record.within_geofence ? 'WFO' : 'WFA';
    const colorClass = record.within_geofence ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100';
    return { text: status, color: colorClass };
  };

  const getCorrectionReason = (record: CorrectionRecord) => {
    const reasons = [];
    
    // Check for missing attendance
    if (!record.check_in_at_utc && !record.check_out_at_utc) {
      reasons.push('Tidak ada check-in dan check-out');
    } else if (!record.check_in_at_utc) {
      reasons.push('Tidak ada check-in');
    } else if (!record.check_out_at_utc) {
      reasons.push('Tidak ada check-out');
    }
    
    // Check for WFA
    if (record.check_in_at_utc && !record.within_geofence) {
      reasons.push('Check-in di luar area kantor (WFA)');
    }
    
    // Check for system notes
    if (record.note && record.note.includes('luar area kantor')) {
      reasons.push('Sistem mendeteksi lokasi di luar area');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Tidak ada masalah';
  };

  const getCorrectionStatus = (record: CorrectionRecord) => {
    if (!record.correction_status) {
      return { text: 'Belum Diajukan', color: 'text-gray-600 bg-gray-100' };
    }
    
    switch (record.correction_status) {
      case 'pending':
        return { text: 'Menunggu Approval', color: 'text-yellow-600 bg-yellow-100' };
      case 'approved':
        return { text: 'Disetujui', color: 'text-green-600 bg-green-100' };
      case 'rejected':
        return { text: 'Ditolak', color: 'text-red-600 bg-red-100' };
      default:
        return { text: 'Unknown', color: 'text-gray-600 bg-gray-100' };
    }
  };

  // TanStack Table columns
  const columns: ColumnDef<CorrectionRecord>[] = [
    { 
      header: 'Tanggal', 
      accessorKey: 'date_local', 
      cell: ({ row }) => formatDate(row.original.date_local) 
    },
    { 
      header: 'Status Absensi', 
      id: 'attendance_status', 
      cell: ({ row }) => {
        const status = getAttendanceStatus(row.original);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.text}
          </span>
        );
      }
    },
    { 
      header: 'WFA/WFO', 
      id: 'wfa_wfo', 
      cell: ({ row }) => {
        const status = getWfaWfoStatus(row.original);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.text}
          </span>
        );
      }
    },
    { 
      header: 'Check-in', 
      id: 'check_in', 
      cell: ({ row }) => formatTime(row.original.check_in_at_utc) 
    },
    { 
      header: 'Check-out', 
      id: 'check_out', 
      cell: ({ row }) => formatTime(row.original.check_out_at_utc) 
    },
    { 
      header: 'Alasan Perbaikan', 
      id: 'correction_reason', 
      cell: ({ row }) => (
        <div className="max-w-[300px] text-xs">
          {getCorrectionReason(row.original)}
        </div>
      )
    },
    { 
      header: 'Status Perbaikan', 
      id: 'correction_status', 
      cell: ({ row }) => {
        const status = getCorrectionStatus(row.original);
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
            {status.text}
          </span>
        );
      }
    },
    { 
      header: 'Actions', 
      id: 'actions', 
      cell: ({ row }) => {
        const record = row.original;
        const needsCorrection = !record.check_in_at_utc || !record.check_out_at_utc || 
                               (record.check_in_at_utc && !record.within_geofence);
        
        if (needsCorrection && !record.correction_status) {
          return (
            <div className="flex flex-col gap-1">
              <Link href={`/pegawai/corrections/request?date=${record.date_local}`}>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ajukan Perbaikan
                </Button>
              </Link>
            </div>
          );
        } else if (record.correction_status === 'pending') {
          return (
            <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
              ⏳ Menunggu
            </span>
          );
        } else if (record.correction_status === 'approved') {
          return (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              ✅ Disetujui
            </span>
          );
        } else if (record.correction_status === 'rejected') {
          return (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                ❌ Ditolak
              </span>
              <Link href={`/pegawai/corrections/request?date=${record.date_local}`}>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs px-2 py-1 h-auto bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                >
                  Ajukan Ulang
                </Button>
              </Link>
            </div>
          );
        }
        
        return (
          <span className="text-xs text-gray-500">-</span>
        );
      }
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Attendance Corrections" 
          subtitle="Potensi absensi yang perlu diperbaiki"
          username="Loading..."
          role="pegawai"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading corrections data...</p>
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
          title="Attendance Corrections" 
          subtitle="Potensi absensi yang perlu diperbaiki"
          username="Error"
          role="pegawai"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <h3 className="font-semibold">Error Loading Data</h3>
            <p>{error}</p>
            <Button 
              onClick={() => fetchCorrectionsData()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!correctionsData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          title="Attendance Corrections" 
          subtitle="Potensi absensi yang perlu diperbaiki"
          username="No Data"
          role="pegawai"
        />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">No corrections data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Attendance Corrections" 
        subtitle="Potensi absensi yang perlu diperbaiki"
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

        {/* Summary Cards */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Summary Perbaikan Absensi</h2>
            <Button 
              onClick={() => fetchCorrectionsData(true)}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{correctionsData.summary.total_records}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{correctionsData.summary.wfa_records}</div>
                <div className="text-sm text-gray-600">WFA Records</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{correctionsData.summary.missing_attendance}</div>
                <div className="text-sm text-gray-600">Missing Attendance</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{correctionsData.summary.pending_corrections}</div>
                <div className="text-sm text-gray-600">Pending Corrections</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter data perbaikan absensi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                  {filters.month && <span className="text-gray-400 ml-1">(disabled when month is selected)</span>}
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                  disabled={!!filters.month}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${filters.month ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                  {filters.month && <span className="text-gray-400 ml-1">(disabled when month is selected)</span>}
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                  disabled={!!filters.month}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${filters.month ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month (YYYY-MM)
                  <span className="text-gray-400 ml-1">(overrides date range)</span>
                </label>
                <input
                  type="month"
                  value={filters.month}
                  onChange={(e) => {
                    const monthValue = e.target.value;
                    setFilters(prev => ({ 
                      ...prev, 
                      month: monthValue,
                      start_date: monthValue ? '' : prev.start_date,
                      end_date: monthValue ? '' : prev.end_date
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_submitted">Not Submitted</option>
                </select>
              </div>
            </div>
            
            {/* Filter Summary */}
            {(filters.start_date || filters.end_date || filters.month || filters.status !== 'all') && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Active Filters:</strong>
                  {filters.month && (
                    <span className="ml-2">Month: {filters.month}</span>
                  )}
                  {!filters.month && filters.start_date && filters.end_date && (
                    <span className="ml-2">Date Range: {filters.start_date} to {filters.end_date}</span>
                  )}
                  {filters.status !== 'all' && (
                    <span className="ml-2">Status: {filters.status}</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Reset Filter Button */}
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFilters({
                    start_date: '',
                    end_date: '',
                    month: '',
                    status: 'all'
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

        {/* Corrections Table */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Potensi Perbaikan Absensi</h2>
          {correctionsData.correction_records.length > 0 ? (
            <TanstackTable data={correctionsData.correction_records} columns={columns} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500 mb-4">
                  {filters.start_date || filters.end_date || filters.month || filters.status !== 'all' 
                    ? 'Tidak ada data perbaikan absensi untuk filter yang dipilih'
                    : 'Tidak ada data perbaikan absensi untuk periode ini'
                  }
                </div>
                {(filters.start_date || filters.end_date || filters.month || filters.status !== 'all') && (
                  <Button 
                    onClick={() => {
                      setFilters({
                        start_date: '',
                        end_date: '',
                        month: '',
                        status: 'all'
                      });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Reset Filter
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TanstackTable({ data, columns }: { data: CorrectionRecord[]; columns: ColumnDef<CorrectionRecord>[] }) {
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
      <div className="p-3 grid gap-2 md:grid-cols-5 grid-cols-1 border-b bg-gray-50">
        <input
          placeholder="Filter Tanggal (YYYY-MM-DD)"
          value={(table.getColumn('date_local')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('date_local')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter Status Absensi"
          value={(table.getColumn('attendance_status')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('attendance_status')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <input
          placeholder="Filter WFA/WFO"
          value={(table.getColumn('wfa_wfo')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('wfa_wfo')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <select
          value={(table.getColumn('correction_status')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('correction_status')?.setFilterValue(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">All Correction Status</option>
          <option value="Belum Diajukan">Not Submitted</option>
          <option value="Menunggu Approval">Pending</option>
          <option value="Disetujui">Approved</option>
          <option value="Ditolak">Rejected</option>
        </select>
        <input
          placeholder="Filter Alasan Perbaikan"
          value={(table.getColumn('correction_reason')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('correction_reason')?.setFilterValue(e.target.value)}
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
                No correction records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


