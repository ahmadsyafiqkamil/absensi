"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from '@radix-ui/react-dialog';
import PotentialOvertimeTable from './PotentialOvertimeTable';
import { authFetch } from '@/lib/authFetch';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table';

type OvertimeRequest = {
  id: number;
  date_requested: string;
  overtime_hours: string;
  work_description: string;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected';
  approved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  approved_at: string | null;
  level1_approved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  level1_approved_at: string | null;
  final_approved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  final_approved_at: string | null;
  rejection_reason: string | null;
  overtime_amount: string;
  created_at: string;
  updated_at: string;
};

type OvertimeRequestsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OvertimeRequest[];
};

type OvertimeSummary = {
  total_requests: number;
  pending_requests: number;
  level1_approved_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_approved_hours: number;
  total_approved_amount: number;
};

function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Custom filter function for month filtering
const monthFilterFn: FilterFn<any> = (row, columnId, value: string) => {
  if (!value) return true;
  
  const dateValue = row.getValue(columnId) as string;
  if (!dateValue) return false;
  
  const date = new Date(dateValue);
  const filterDate = new Date(value);
  
  return date.getFullYear() === filterDate.getFullYear() && 
         date.getMonth() === filterDate.getMonth();
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'level1_approved':
      return 'text-blue-600 bg-blue-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    case 'pending':
    default:
      return 'text-orange-600 bg-orange-100';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'approved':
      return 'Final Disetujui';
    case 'level1_approved':
      return 'Level 1 Disetujui';
    case 'rejected':
      return 'Ditolak';
    case 'pending':
    default:
      return 'Menunggu';
  }
}

const columnHelper = createColumnHelper<OvertimeRequest>();

export default function OvertimeRequestsManager() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date_requested: '',
    overtime_hours: '',
    work_description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    // Default to current month
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Apply month filter when monthFilter changes
  useEffect(() => {
    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      setColumnFilters(prev => {
        const existingFilter = prev.find(filter => filter.id === 'date_requested');
        if (existingFilter) {
          return prev.map(filter => 
            filter.id === 'date_requested' 
              ? { ...filter, value: monthFilter }
              : filter
          );
        } else {
          return [...prev, { id: 'date_requested', value: monthFilter }];
        }
      });
    } else {
      // Remove date filter if monthFilter is empty
      setColumnFilters(prev => prev.filter(filter => filter.id !== 'date_requested'));
    }
  }, [monthFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [requestsResponse, summaryResponse] = await Promise.all([
        authFetch('/api/overtime-requests/'),
        authFetch('/api/overtime-requests/summary/')
      ]);

      if (!requestsResponse.ok || !summaryResponse.ok) {
        throw new Error('Failed to fetch overtime data');
      }

      const requestsData: OvertimeRequestsResponse = await requestsResponse.json();
      const summaryData: OvertimeSummary = await summaryResponse.json();

      setRequests(requestsData.results);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overtime data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      const response = await authFetch('/api/overtime-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData) {
          // Handle field validation errors
          const errors: Record<string, string> = {};
          Object.keys(errorData).forEach(key => {
            if (Array.isArray(errorData[key])) {
              errors[key] = errorData[key][0];
            } else {
              errors[key] = errorData[key];
            }
          });
          setFormErrors(errors);
          return;
        }
        throw new Error('Failed to submit overtime request');
      }

      // Reset form and close modal
      setFormData({
        date_requested: '',
        overtime_hours: '',
        work_description: '',
      });
      setIsModalOpen(false);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit overtime request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleQuickSubmit = (date: string, hours: number, defaultDescription: string) => {
    setFormData({
      date_requested: date,
      overtime_hours: hours.toString(),
      work_description: defaultDescription,
    });
    setIsModalOpen(true);
  };

  const handleDownload = async (requestId: number) => {
    try {
      setError(''); // Clear previous errors
      setDownloadingId(requestId); // Set downloading state
      
      const response = await fetch(`/api/overtime-requests/${requestId}/download`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to download document: ${response.status} ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Surat_Perintah_Kerja_Lembur_${requestId}.docx`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      setError(''); // Clear any previous errors
      setSuccessMessage(`Dokumen DOCX berhasil di-download: ${filename}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setDownloadingId(null); // Clear downloading state
    }
  };

  const handleExportPdf = async (requestId: number) => {
    try {
      setError(''); // Clear previous errors
      setDownloadingId(requestId); // Set downloading state
      
      const response = await fetch(`/api/overtime-requests/${requestId}/export-pdf`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to export PDF: ${response.status} ${response.statusText}`);
      }
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `Surat_Perintah_Lembur_${requestId}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      setError(''); // Clear any previous errors
      setSuccessMessage(`Dokumen PDF berhasil di-export: ${filename}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Export PDF error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setDownloadingId(null); // Clear downloading state
    }
  };

  const handleExportListPdf = async () => {
    try {
      setError(''); // Clear previous errors
      setDownloadingId('list'); // Set downloading state for list
      
      // Build query parameters
      const params = new URLSearchParams();
      if (monthFilter) {
        params.append('month', monthFilter);
      }
      // Note: status filter is not implemented in the backend yet
      
      const response = await fetch(`/api/overtime-requests/export-list-pdf?${params.toString()}`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to export list PDF: ${response.status} ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'daftar-pengajuan-lembur.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success message
      setError(''); // Clear any previous errors
      setSuccessMessage(`Daftar pengajuan lembur berhasil di-export: ${filename}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Export list PDF error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export list PDF');
    } finally {
      setDownloadingId(null); // Clear downloading state
    }
  };

  const columns = [
    columnHelper.accessor('date_requested', {
      header: 'Tanggal',
      cell: (info) => formatDate(info.getValue()),
      filterFn: monthFilterFn,
    }),
    columnHelper.accessor('overtime_hours', {
      header: 'Jam Lembur',
      cell: (info) => `${info.getValue()}j`,
    }),
    columnHelper.accessor('work_description', {
      header: 'Deskripsi Pekerjaan',
      cell: (info) => (
        <div className="max-w-xs truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('overtime_amount', {
      header: 'Jumlah Gaji',
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const request = info.row.original;
        const status = info.getValue();
        return (
          <div className="flex flex-col space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
            
            {/* Approval workflow indicators */}
            {status === 'level1_approved' && request.level1_approved_by && (
              <div className="text-xs text-blue-600">
                ✓ Level 1: {request.level1_approved_by.username}
              </div>
            )}
            
            {status === 'approved' && (
              <div className="text-xs space-y-1">
                {request.level1_approved_by && (
                  <div className="text-blue-600">
                    ✓ Level 1: {request.level1_approved_by.username}
                  </div>
                )}
                {request.final_approved_by && (
                  <div className="text-green-600">
                    ✓ Final: {request.final_approved_by.username}
                  </div>
                )}
              </div>
            )}
            
            {status === 'rejected' && request.rejection_reason && (
              <div className="text-xs text-red-600" title={request.rejection_reason}>
                Alasan: {request.rejection_reason.length > 30 
                  ? request.rejection_reason.substring(0, 30) + '...' 
                  : request.rejection_reason}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Tanggal Pengajuan',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: (info) => {
        const request = info.row.original;
        return (
          <div className="flex flex-col space-y-1">
            {request.status === 'approved' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                  onClick={() => handleDownload(request.id)}
                  disabled={downloadingId === request.id}
                >
                  {downloadingId === request.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-700 mr-1"></div>
                      Downloading...
                    </>
                  ) : (
                    '📄 Download DOCX'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                  onClick={() => handleExportPdf(request.id)}
                  disabled={downloadingId === request.id}
                >
                  {downloadingId === request.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-700 mr-1"></div>
                      Exporting...
                    </>
                  ) : (
                    '📑 Export PDF'
                  )}
                </Button>
              </div>
            )}
            {request.status === 'rejected' && (
              <div className="text-xs text-red-600">
                Ditolak: {request.rejection_reason?.substring(0, 30) || 'Tidak ada alasan'}...
              </div>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: requests,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Lembur</CardTitle>
          <CardDescription>Loading overtime requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Lembur</CardTitle>
          <CardDescription>Error loading overtime data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-center py-4">
            {error}
            <button 
              onClick={fetchData}
              className="ml-2 text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Pengajuan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.total_requests}
              </div>
              <p className="text-xs text-gray-500">
                Pengajuan lembur
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Menunggu Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.pending_requests}
              </div>
              <p className="text-xs text-gray-500">
                Belum disetujui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Level 1 Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.level1_approved_requests || 0}
              </div>
              <p className="text-xs text-gray-500">
                Menunggu final approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Jam Disetujui</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.total_approved_hours.toFixed(1)}j
              </div>
              <p className="text-xs text-gray-500">
                Jam lembur disetujui
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Gaji Lembur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.total_approved_amount)}
              </div>
              <p className="text-xs text-gray-500">
                Yang disetujui
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10.586 10l-1.293 1.293a1 1 0 101.414 1.414L12 11.414l1.293 1.293a1 1 0 001.414-1.414L13.414 10l1.293-1.293a1 1 0 00-1.414-1.414L12 8.586l-1.293-1.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end items-center mb-4">
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          {/* <Dialog.Trigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Ajukan Lembur
            </Button>
          </Dialog.Trigger> */}
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Ajukan Lembur
              </Dialog.Title>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date_requested">Tanggal Lembur *</Label>
                  <Input
                    id="date_requested"
                    name="date_requested"
                    type="date"
                    value={formData.date_requested}
                    onChange={handleInputChange}
                    className={formErrors.date_requested ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.date_requested && (
                    <p className="text-sm text-red-600">{formErrors.date_requested}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime_hours">Jam Lembur *</Label>
                  <Input
                    id="overtime_hours"
                    name="overtime_hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="12"
                    value={formData.overtime_hours}
                    onChange={handleInputChange}
                    placeholder="Contoh: 2.5"
                    className={formErrors.overtime_hours ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.overtime_hours && (
                    <p className="text-sm text-red-600">{formErrors.overtime_hours}</p>
                  )}
                  <p className="text-sm text-gray-500">Maksimal 12 jam per hari</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_description">Deskripsi Pekerjaan *</Label>
                  <textarea
                    id="work_description"
                    name="work_description"
                    value={formData.work_description}
                    onChange={handleInputChange}
                    placeholder="Jelaskan pekerjaan yang dilakukan selama lembur..."
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.work_description ? 'border-red-500' : ''}`}
                    rows={4}
                    required
                  />
                  {formErrors.work_description && (
                    <p className="text-sm text-red-600">{formErrors.work_description}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline">
                      Batal
                    </Button>
                  </Dialog.Close>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={submitting}
                  >
                    {submitting ? 'Mengajukan...' : 'Ajukan Lembur'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Potential Overtime Table */}
      <PotentialOvertimeTable onQuickSubmit={handleQuickSubmit} />

      {/* Riwayat Section */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Riwayat Pengajuan Lembur</h2>
      </div>

      {/* Overtime Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Lembur</CardTitle>
          <CardDescription>
            {requests.length > 0 
              ? `Menampilkan ${requests.length} pengajuan lembur` 
              : 'Belum ada pengajuan lembur'
            }
            {monthFilter && (
              <span className="ml-2 text-blue-600">
                • Filter: {new Date(monthFilter).toLocaleDateString('id-ID', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">Belum ada pengajuan lembur</p>
              <p className="text-sm">Klik tombol "Ajukan Lembur" untuk membuat pengajuan baru</p>
            </div>
          ) : (
            <>
              {/* Filters and Search */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* Month Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-filter" className="text-sm font-medium text-gray-700">
                    Filter Bulan:
                  </Label>
                  <Input
                    id="month-filter"
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-40"
                  />
                  {monthFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMonthFilter('')}
                      className="text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Global Search */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Cari pengajuan..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-500">
                  {monthFilter ? (
                    <>
                      Menampilkan <span className="font-medium text-blue-600">{table.getFilteredRowModel().rows.length}</span> dari{' '}
                      <span className="font-medium">{requests.length}</span> data
                      <span className="text-blue-600 ml-1">
                        ({Math.round((table.getFilteredRowModel().rows.length / requests.length) * 100)}%)
                      </span>
                    </>
                  ) : (
                    `Menampilkan ${table.getFilteredRowModel().rows.length} dari ${requests.length} data`
                  )}
                </div>

                {/* Export Filtered Data to PDF */}
                {monthFilter && table.getFilteredRowModel().rows.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportListPdf}
                    disabled={downloadingId === 'list'}
                    className="text-xs bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    {downloadingId === 'list' ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-1"></div>
                        Exporting...
                      </>
                    ) : (
                      '📑 Export PDF'
                    )}
                  </Button>
                )}
              </div>

              {/* TanStack Table */}
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} className="border-b">
                          {headerGroup.headers.map(header => (
                            <th key={header.id} className="text-left py-3 px-2">
                              {header.isPlaceholder ? null : (
                                <div
                                  {...{
                                    className: header.column.getCanSort()
                                      ? 'cursor-pointer select-none flex items-center gap-2'
                                      : '',
                                    onClick: header.column.getToggleSortingHandler(),
                                  }}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                  {{
                                    asc: ' ↑',
                                    desc: ' ↓',
                                  }[header.column.getIsSorted() as string] ?? null}
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="py-3 px-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
                      {table.getPageCount()}
                    </p>
                    <select
                      value={table.getState().pagination.pageSize}
                      onChange={e => {
                        table.setPageSize(Number(e.target.value))
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      {[5, 10, 20, 30].map(pageSize => (
                        <option key={pageSize} value={pageSize}>
                          {pageSize} per halaman
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(0)}
                      disabled={!table.getCanPreviousPage()}
                    >
                      ««
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    >
                      «
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    >
                      »
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                      disabled={!table.getCanNextPage()}
                    >
                      »»
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
