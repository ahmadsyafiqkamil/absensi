"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, FileText, MapPin, Upload, X } from 'lucide-react';
import Header from '@/components/Header';
import Link from 'next/link';
import { authFetch } from '@/lib/authFetch';
import { BACKEND_BASE_URL } from '@/lib/backend';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
  
  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CorrectionRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState({
    type: 'check_in' as 'check_in' | 'check_out' | 'both',
    reason: '',
    attachment: null as File | null,
    proposed_check_in_time: '',
    proposed_check_out_time: ''
  });
  const [manualCorrectionForm, setManualCorrectionForm] = useState({
    date_local: '',
    type: 'check_in' as 'check_in' | 'check_out' | 'both',
    reason: '',
    attachment: null as File | null,
    proposed_check_in_time: '',
    proposed_check_out_time: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCorrectionsData();
    // Reset pagination when filters change
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [filters]);

  // Auto-refresh every 30 seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     console.log('Auto-refreshing data...');
  //     fetchCorrectionsData(true);
  //   }, 30000); // 30 seconds

  //   return () => clearInterval(interval);
  // }, []);

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
      
      const response = await authFetch(`${BACKEND_BASE_URL}/api/attendance/corrections?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch corrections data');
      }
      
      const data: CorrectionsResponse = await response.json();
      console.log('Fetched corrections data:', data);
      console.log('Total records:', data.correction_records.length);
      console.log('Summary:', data.summary);
      setCorrectionsData(data);
    } catch (err) {
      console.error('Error fetching corrections data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Modal functions
  const openCorrectionModal = (record: CorrectionRecord) => {
    setSelectedRecord(record);
    // Auto-detect correction type based on record
    let correctionType: 'check_in' | 'check_out' | 'both' = 'both';
    if (!record.check_in_at_utc && record.check_out_at_utc) {
      correctionType = 'check_in';
    } else if (record.check_in_at_utc && !record.check_out_at_utc) {
      correctionType = 'check_out';
    }
    
    // Extract time from existing record if available
    let proposedCheckInTime = '';
    let proposedCheckOutTime = '';
    
    if (record.check_in_at_utc) {
      try {
        const checkInDate = new Date(record.check_in_at_utc);
        proposedCheckInTime = checkInDate.toTimeString().slice(0, 5);
      } catch (e) {
        proposedCheckInTime = '';
      }
    }
    
    if (record.check_out_at_utc) {
      try {
        const checkOutDate = new Date(record.check_out_at_utc);
        proposedCheckOutTime = checkOutDate.toTimeString().slice(0, 5);
      } catch (e) {
        proposedCheckOutTime = '';
      }
    }
    
    setCorrectionForm({
      type: correctionType,
      reason: '',
      attachment: null,
      proposed_check_in_time: proposedCheckInTime,
      proposed_check_out_time: proposedCheckOutTime
    });
    setIsModalOpen(true);
  };

  const openManualCorrectionModal = () => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setManualCorrectionForm({
      date_local: today,
      type: 'check_in',
      reason: '',
      attachment: null,
      proposed_check_in_time: '',
      proposed_check_out_time: ''
    });
    setIsManualModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
    setCorrectionForm({
      type: 'check_in',
      reason: '',
      attachment: null,
      proposed_check_in_time: '',
      proposed_check_out_time: ''
    });
  };

  const closeManualModal = () => {
    setIsManualModalOpen(false);
    setManualCorrectionForm({
      date_local: '',
      type: 'check_in',
      reason: '',
      attachment: null,
      proposed_check_in_time: '',
      proposed_check_out_time: ''
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCorrectionForm(prev => ({ ...prev, attachment: file }));
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setManualCorrectionForm(prev => ({ ...prev, attachment: file }));
  };

  const removeAttachment = () => {
    setCorrectionForm(prev => ({ ...prev, attachment: null }));
  };

  const removeManualAttachment = () => {
    setManualCorrectionForm(prev => ({ ...prev, attachment: null }));
  };

  const submitCorrection = async () => {
    if (!selectedRecord || !correctionForm.reason.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('date_local', selectedRecord.date_local);
      formData.append('type', correctionForm.type);
      formData.append('reason', correctionForm.reason);
      if (correctionForm.attachment) {
        formData.append('attachment', correctionForm.attachment);
      }
      if (correctionForm.proposed_check_in_time) {
        formData.append('proposed_check_in_time', correctionForm.proposed_check_in_time);
      }
      if (correctionForm.proposed_check_out_time) {
        formData.append('proposed_check_out_time', correctionForm.proposed_check_out_time);
      }

      const response = await authFetch(`${BACKEND_BASE_URL}/api/attendance/corrections/request`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit correction request');
      }

      // Close modal and refresh data
      closeModal();
      fetchCorrectionsData(true);
      
      // Show success message (you can add a toast notification here)
      alert('Permintaan perbaikan berhasil diajukan!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit correction request');
    } finally {
      setSubmitting(false);
    }
  };

  const submitManualCorrection = async () => {
    if (!manualCorrectionForm.date_local || !manualCorrectionForm.reason.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('date_local', manualCorrectionForm.date_local);
      formData.append('type', manualCorrectionForm.type);
      formData.append('reason', manualCorrectionForm.reason);
      if (manualCorrectionForm.attachment) {
        formData.append('attachment', manualCorrectionForm.attachment);
      }
      if (manualCorrectionForm.proposed_check_in_time) {
        formData.append('proposed_check_in_time', manualCorrectionForm.proposed_check_in_time);
      }
      if (manualCorrectionForm.proposed_check_out_time) {
        formData.append('proposed_check_out_time', manualCorrectionForm.proposed_check_out_time);
      }

      const response = await authFetch(`${BACKEND_BASE_URL}/api/attendance/corrections/request`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit manual correction request');
      }

      // Close modal and refresh data
      closeModal();
      fetchCorrectionsData(true);
      
      // Show success message
      alert('Permintaan perbaikan manual berhasil diajukan!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit manual correction request');
    } finally {
      setSubmitting(false);
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
      cell: ({ row }) => formatDate(row.original.date_local),
      enableSorting: true,
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
      cell: ({ row }) => formatTime(row.original.check_in_at_utc),
      enableSorting: true,
    },
    { 
      header: 'Check-out', 
      id: 'check_out', 
      cell: ({ row }) => formatTime(row.original.check_out_at_utc),
      enableSorting: true,
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
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-auto bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                onClick={() => openCorrectionModal(record)}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajukan Perbaikan
              </Button>
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
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs px-2 py-1 h-auto bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => openCorrectionModal(record)}
              >
                Ajukan Ulang
              </Button>
            </div>
          );
        }
        
        return (
          <span className="text-xs text-gray-500">-</span>
        );
      }
    },
  ];

  // TanStack Table configuration
  const table = useReactTable({
    data: correctionsData?.correction_records || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: {
      pagination,
      sorting,
    },
    manualPagination: false,
    pageCount: Math.ceil((correctionsData?.correction_records.length || 0) / pagination.pageSize),
    // Enable sorting
    enableSorting: true,
    // Enable column filters
    enableColumnFilters: false,
    // Enable global filters
    enableGlobalFilter: false,
  });

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
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Summary Perbaikan Absensi</h2>
              {correctionsData && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {new Date().toLocaleTimeString('id-ID')} | 
                  Data count: {correctionsData.correction_records.length} records |
                  Page: {pagination.pageIndex + 1} of {Math.ceil(correctionsData.correction_records.length / pagination.pageSize)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => openManualCorrectionModal()}
                variant="default"
                size="sm"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajukan Perbaikan Manual
              </Button>
              <Button 
                onClick={() => {
                  console.log('Force refresh clicked');
                  fetchCorrectionsData(true);
                }}
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
                  {/* <span className="text-gray-400 ml-1">(overrides date range)</span> */}
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
            <div>
              {/* Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center gap-2">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {header.column.getCanSort() && (
                                  <span className="text-gray-400">
                                    {{
                                      asc: '↑',
                                      desc: '↓',
                                    }[header.column.getIsSorted() as string] ?? '↕'}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-gray-50"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{table.getFilteredRowModel().rows.length}</span>{' '}
                    results
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">Go to previous page</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => {
                      const pageIndex = table.getState().pagination.pageIndex;
                      const pageCount = table.getPageCount();
                      
                      // Show first page, last page, current page, and pages around current
                      if (i === 0 || i === Math.min(4, pageCount - 1) || 
                          (i >= Math.max(0, pageIndex - 1) && i <= Math.min(pageCount - 1, pageIndex + 1))) {
                        return (
                          <Button
                            key={i}
                            variant={pageIndex === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => table.setPageIndex(i)}
                            className="h-8 w-8 p-0"
                          >
                            {i + 1}
                          </Button>
                        );
                      } else if (i === 1 && pageIndex > 2) {
                        return <span key={i} className="px-2 text-sm text-gray-500">...</span>;
                      } else if (i === Math.min(3, pageCount - 2) && pageIndex < pageCount - 3) {
                        return <span key={i} className="px-2 text-sm text-gray-500">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-8 w-8 p-0"
                  >
                    <span className="sr-only">Go to next page</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Rows per page:</span>
                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[5, 10, 20, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={pageSize.toString()}>
                          {pageSize}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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

      {/* Correction Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white border border-gray-200 shadow-xl dialog-content overflow-hidden">
          <DialogHeader className="bg-white dialog-header pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Ajukan Perbaikan Absensi
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Ajukan perbaikan untuk tanggal {selectedRecord?.date_local && new Date(selectedRecord.date_local).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 bg-white overflow-y-auto max-h-[calc(90vh-200px)] px-1">
            {/* Correction Type */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="correction-type" className="text-sm font-medium text-gray-900">
                Jenis Perbaikan <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={correctionForm.type} 
                onValueChange={(value: 'check_in' | 'check_out' | 'both') => {
                  console.log('Auto Select value changed:', value);
                  setCorrectionForm(prev => ({ ...prev, type: value }));
                }}
                onOpenChange={(open) => {
                  console.log('Auto Select open state:', open);
                }}
              >
                <SelectTrigger 
                  className="w-full bg-white border-gray-300"
                  onClick={() => console.log('Auto Select trigger clicked')}
                >
                  <SelectValue placeholder="Pilih jenis perbaikan yang diperlukan" />
                </SelectTrigger>
                <SelectContent className="z-[99999]">
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="check_out">Check-out</SelectItem>
                  <SelectItem value="both">Keduanya (Check-in & Check-out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Proposed Check-in Time */}
            {(correctionForm.type === 'check_in' || correctionForm.type === 'both') && (
              <div className="grid gap-2 bg-white">
                <Label htmlFor="proposed-check-in-time" className="text-sm font-medium text-gray-900">
                  Jam Perbaikan Check-in <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposed-check-in-time"
                  type="time"
                  value={correctionForm.proposed_check_in_time}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, proposed_check_in_time: e.target.value }))}
                  className="w-full bg-white border-gray-300"
                  required
                />
                <p className="text-xs text-gray-500">
                  Masukkan jam check-in yang seharusnya
                </p>
              </div>
            )}

            {/* Proposed Check-out Time */}
            {(correctionForm.type === 'check_out' || correctionForm.type === 'both') && (
              <div className="grid gap-2 bg-white">
                <Label htmlFor="proposed-check-out-time" className="text-sm font-medium text-gray-900">
                  Jam Perbaikan Check-out <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposed-check-out-time"
                  type="time"
                  value={correctionForm.proposed_check_out_time}
                  onChange={(e) => setCorrectionForm(prev => ({ ...prev, proposed_check_out_time: e.target.value }))}
                  className="w-full bg-white border-gray-300"
                  required
                />
                <p className="text-xs text-gray-500">
                  Masukkan jam check-out yang seharusnya
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="reason" className="text-sm font-medium text-gray-900">
                Alasan Perbaikan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan secara detail alasan mengapa perlu perbaikan absensi..."
                value={correctionForm.reason}
                onChange={(e) => setCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                className="resize-none bg-white border-gray-300"
                required
              />
              <p className="text-xs text-gray-500">
                Minimal 10 karakter untuk alasan yang jelas
              </p>
            </div>

            {/* Attachment */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="attachment" className="text-sm font-medium text-gray-900">
                Lampiran Pendukung
              </Label>
              <div className="mt-1">
                {correctionForm.attachment ? (
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {correctionForm.attachment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(correctionForm.attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeAttachment}
                      className="h-8 w-8 p-0 hover:bg-gray-200"
                    >
                      <X className="w-4 h-4" />
                      <span className="sr-only">Hapus file</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="file-upload" className="cursor-pointer w-full">
                      <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Upload file pendukung
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          PDF, DOC, DOCX, JPG, atau PNG<br />
                          Maksimal 10MB
                        </p>
                      </div>
                    <input 
                        id="file-upload"
                      type="file" 
                        className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                    />
                    </label>
                      </div>
                    )}
                  </div>
                  </div>
        </div>

          <DialogFooter className="gap-3 bg-white pt-4 border-t border-gray-100 dialog-footer sticky bottom-0 bg-white">
            <Button 
              variant="outline" 
              onClick={closeModal} 
              disabled={submitting}
              className="min-w-[100px]"
            >
              Batal
            </Button>
            <Button 
              onClick={submitCorrection} 
              disabled={
                submitting || 
                !correctionForm.reason.trim() || 
                correctionForm.reason.trim().length < 10 ||
                (correctionForm.type === 'check_in' && !correctionForm.proposed_check_in_time) ||
                (correctionForm.type === 'check_out' && !correctionForm.proposed_check_out_time) ||
                (correctionForm.type === 'both' && (!correctionForm.proposed_check_in_time || !correctionForm.proposed_check_out_time))
              }
              className="min-w-[160px] bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mengirim...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ajukan Perbaikan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Correction Request Modal */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] bg-white border border-gray-200 shadow-xl dialog-content overflow-hidden">
          <DialogHeader className="bg-white dialog-header pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Ajukan Perbaikan Absensi Manual
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Ajukan perbaikan absensi untuk tanggal yang tidak ada di daftar. Pastikan semua informasi diisi dengan lengkap.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4 bg-white overflow-y-auto max-h-[calc(90vh-200px)] px-1">
            {/* Date Selection */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="manual-date" className="text-sm font-medium text-gray-900">
                Tanggal Absensi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="manual-date"
                type="date"
                value={manualCorrectionForm.date_local}
                onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, date_local: e.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-white border-gray-300"
                required
              />
              <p className="text-xs text-gray-500">
                Tidak dapat memilih tanggal masa depan
              </p>
            </div>

            {/* Correction Type */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="manual-correction-type" className="text-sm font-medium text-gray-900">
                Jenis Perbaikan <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={manualCorrectionForm.type} 
                onValueChange={(value: 'check_in' | 'check_out' | 'both') => {
                  console.log('Select value changed:', value);
                  setManualCorrectionForm(prev => ({ ...prev, type: value }));
                }}
                onOpenChange={(open) => {
                  console.log('Select open state:', open);
                }}
              >
                <SelectTrigger 
                  className="w-full bg-white border-gray-300"
                  onClick={() => console.log('Select trigger clicked')}
                >
                  <SelectValue placeholder="Pilih jenis perbaikan yang diperlukan" />
                </SelectTrigger>
                <SelectContent className="z-[99999]">
                  <SelectItem value="check_in">Check-in</SelectItem>
                  <SelectItem value="check_out">Check-out</SelectItem>
                  <SelectItem value="both">Keduanya (Check-in & Check-out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Proposed Check-in Time */}
            {(manualCorrectionForm.type === 'check_in' || manualCorrectionForm.type === 'both') && (
              <div className="grid gap-2 bg-white">
                <Label htmlFor="proposed-check-in-time" className="text-sm font-medium text-gray-900">
                  Jam Perbaikan Check-in <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposed-check-in-time"
                  type="time"
                  value={manualCorrectionForm.proposed_check_in_time}
                  onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, proposed_check_in_time: e.target.value }))}
                  className="w-full bg-white border-gray-300"
                  required
                />
                <p className="text-xs text-gray-500">
                  Masukkan jam check-in yang seharusnya
                </p>
              </div>
            )}

            {/* Proposed Check-out Time */}
            {(manualCorrectionForm.type === 'check_out' || manualCorrectionForm.type === 'both') && (
              <div className="grid gap-2 bg-white">
                <Label htmlFor="proposed-check-out-time" className="text-sm font-medium text-gray-900">
                  Jam Perbaikan Check-out <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="proposed-check-out-time"
                  type="time"
                  value={manualCorrectionForm.proposed_check_out_time}
                  onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, proposed_check_out_time: e.target.value }))}
                  className="w-full bg-white border-gray-300"
                  required
                />
                <p className="text-xs text-gray-500">
                  Masukkan jam check-out yang seharusnya
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="manual-reason" className="text-sm font-medium text-gray-900">
                Alasan Perbaikan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="manual-reason"
                placeholder="Jelaskan secara detail alasan mengapa perlu perbaikan absensi pada tanggal tersebut..."
                value={manualCorrectionForm.reason}
                onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                className="resize-none bg-white border-gray-300"
                required
              />
              <p className="text-xs text-gray-500">
                Minimal 10 karakter untuk alasan yang jelas
              </p>
            </div>

            {/* Attachment */}
            <div className="grid gap-2 bg-white">
              <Label htmlFor="manual-attachment" className="text-sm font-medium text-gray-900">
                Lampiran Pendukung
              </Label>
              <div className="mt-1">
                {manualCorrectionForm.attachment ? (
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {manualCorrectionForm.attachment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(manualCorrectionForm.attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeManualAttachment}
                      className="h-8 w-8 p-0 hover:bg-gray-200"
                    >
                      <X className="w-4 h-4" />
                      <span className="sr-only">Hapus file</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="manual-file-upload" className="cursor-pointer w-full">
                      <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Upload file pendukung
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          PDF, DOC, DOCX, JPG, atau PNG<br />
                          Maksimal 10MB
                        </p>
                      </div>
                      <input
                        id="manual-file-upload"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleManualFileChange}
                      />
                    </label>
                        </div>
                      )}
              </div>
                    </div>
                </div>

          <DialogFooter className="gap-3 bg-white pt-4 border-t border-gray-100 dialog-footer sticky bottom-0 bg-white">
            <Button 
              variant="outline" 
              onClick={closeManualModal} 
              disabled={submitting}
              className="min-w-[100px]"
            >
              Batal
            </Button>
            <Button 
              onClick={submitManualCorrection} 
              disabled={
                submitting || 
                !manualCorrectionForm.date_local || 
                !manualCorrectionForm.reason.trim() || 
                manualCorrectionForm.reason.trim().length < 10 ||
                (manualCorrectionForm.type === 'check_in' && !manualCorrectionForm.proposed_check_in_time) ||
                (manualCorrectionForm.type === 'check_out' && !manualCorrectionForm.proposed_check_out_time) ||
                (manualCorrectionForm.type === 'both' && (!manualCorrectionForm.proposed_check_in_time || !manualCorrectionForm.proposed_check_out_time))
              }
              className="min-w-[180px] bg-green-600 hover:bg-green-700 focus:ring-green-500"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Mengirim...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Ajukan Perbaikan Manual
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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


