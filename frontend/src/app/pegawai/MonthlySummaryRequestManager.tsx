"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as Dialog from '@radix-ui/react-dialog';
import { authFetch } from '@/lib/authFetch';
import { getBackendUrl } from '@/lib/backend';
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
} from '@tanstack/react-table';

type OvertimeSummaryRequest = {
  id: number;
  request_period: string;
  request_title: string;
  request_description: string;
  include_overtime_details: boolean;
  include_overtime_summary: boolean;
  include_approver_info: boolean;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected' | 'cancelled' | 'completed';
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
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
};

type OvertimeSummaryRequestsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OvertimeSummaryRequest[];
};

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

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-100';
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'level1_approved':
      return 'text-blue-600 bg-blue-100';
    case 'rejected':
      return 'text-red-600 bg-red-100';
    case 'cancelled':
      return 'text-gray-600 bg-gray-100';
    case 'pending':
    default:
      return 'text-orange-600 bg-orange-100';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return 'Selesai';
    case 'approved':
      return 'Final Disetujui';
    case 'level1_approved':
      return 'Level 1 Disetujui';
    case 'rejected':
      return 'Ditolak';
    case 'cancelled':
      return 'Dibatalkan';
    case 'pending':
    default:
      return 'Menunggu';
  }
}

const columnHelper = createColumnHelper<OvertimeSummaryRequest>();

export default function OvertimeSummaryRequestManager() {
  const [requests, setRequests] = useState<OvertimeSummaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    request_period: '',
    request_title: '',
    request_description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${getBackendUrl()}/api/employee/monthly-summary-requests/`);
      
      if (response.ok) {
        const data: OvertimeSummaryRequestsResponse = await response.json();
        setRequests(data.results);
      } else {
        setError('Gagal memuat data pengajuan rekap lembur bulanan');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    // Basic validation
    if (!formData.request_period) {
      setFormErrors({ request_period: 'Periode laporan wajib diisi' });
      setSubmitting(false);
      return;
    }


    try {
      // Prepare data for submission, excluding null/empty fields
      const submitData = { ...formData };
      
      console.log(submitData);
      const response = await authFetch(`${getBackendUrl()}/api/employee/monthly-summary-requests/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        setSuccessMessage('Pengajuan rekap lembur bulanan berhasil dibuat!');
        setIsModalOpen(false);
        
        // Reset form with current period
        const now = new Date();
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setFormData({
          request_period: currentPeriod,
          request_title: '',
          request_description: '',
        });
        
        // Auto-fill title for current period
        const [year, month] = currentPeriod.split('-');
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        const autoTitle = `Rekap Lembur Bulan ${monthName} ${year}`;
        setFormData(prev => ({ ...prev, request_title: autoTitle }));
        
        fetchData();
      } else {
        const errorData = await response.json();
        if (errorData.detail) {
          setFormErrors({ general: errorData.detail });
        } else if (errorData.errors) {
          setFormErrors(errorData.errors);
        } else {
          setFormErrors({ general: 'Gagal membuat pengajuan rekap lembur bulanan' });
        }
      }
    } catch (err) {
      setFormErrors({ general: 'Terjadi kesalahan saat mengirim pengajuan' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill title when period changes
    if (field === 'request_period' && value) {
      const [year, month] = value.split('-');
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[parseInt(month) - 1];
      const autoTitle = `Rekap Lembur Bulan ${monthName} ${year}`;
      setFormData(prev => ({ ...prev, request_title: autoTitle }));
    }
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const columns = [
    columnHelper.accessor('request_period', {
      header: 'Periode',
      cell: info => {
        const [year, month] = info.getValue().split('-');
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
          'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      },
    }),
    columnHelper.accessor('request_title', {
      header: 'Judul Laporan',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(info.getValue())}`}>
          {getStatusText(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor('level1_approved_by', {
      header: 'Level 1 Approval',
      cell: info => info.getValue() ? (
        <div className="text-sm">
          <div className="font-medium">{info.getValue()?.username}</div>
          <div className="text-gray-500">{formatDateTime(info.row.original.level1_approved_at!)}</div>
        </div>
      ) : '-',
    }),
    columnHelper.accessor('final_approved_by', {
      header: 'Final Approval',
      cell: info => info.getValue() ? (
        <div className="text-sm">
          <div className="font-medium">{info.getValue()?.username}</div>
          <div className="text-gray-500">{formatDateTime(info.row.original.final_approved_at!)}</div>
        </div>
      ) : '-',
    }),
    columnHelper.accessor('created_at', {
      header: 'Dibuat Pada',
      cell: info => formatDateTime(info.getValue()),
    }),
    columnHelper.accessor('id', {
      header: 'Aksi',
      cell: info => {
        const request = info.row.original;
        return (
          <div className="flex space-x-2">
            {request.status === 'approved' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/pegawai/monthly-summary/${request.id}/result`, '_blank')}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Lihat Rekap
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await authFetch(`${getBackendUrl()}/api/employee/monthly-summary-requests/${request.id}/export_docx/`);
                      
                      if (response.ok) {
                        // Get blob from response
                        const blob = await response.blob();
                        // Create download link
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Lembur_Bulanan_${request.request_period}.docx`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } else {
                        alert('Gagal export DOCX. Silakan coba lagi.');
                      }
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Terjadi kesalahan saat export DOCX.');
                    }
                  }}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  📄 Export DOCX
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await authFetch(`${getBackendUrl()}/api/employee/monthly-summary-requests/${request.id}/export_pdf/`);
                      
                      if (response.ok) {
                        // Get blob from response
                        const blob = await response.blob();
                        // Create download link
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Lembur_Bulanan_${request.request_period}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } else {
                        alert('Gagal export PDF. Silakan coba lagi.');
                      }
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Terjadi kesalahan saat export PDF.');
                    }
                  }}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  📄 Export PDF
                </Button>
              </>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
  });

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Set default request_period to current month
  useEffect(() => {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, request_period: currentPeriod }));

    // Auto-fill title for current period
    const [year, month] = currentPeriod.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    const autoTitle = `Rekap Lembur Bulan ${monthName} ${year}`;
    setFormData(prev => ({ ...prev, request_title: autoTitle }));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Memuat data...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Pengajuan Rekap Lembur Bulanan</h2>
        <p className="text-gray-600 mt-2">
          Ajukan permintaan rekap bulanan untuk evaluasi kinerja
        </p>
      </div>

      {/* Create Request Button */}
      <div className="mb-6">
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Trigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajukan Rekap Bulanan
            </Button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Ajukan Rekap Bulanan
              </Dialog.Title>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Periode Laporan */}
                <div className="space-y-2">
                  <Label htmlFor="request_period">Periode Laporan *</Label>
                  <Input
                    id="request_period"
                    type="month"
                    value={formData.request_period}
                    onChange={(e) => handleInputChange('request_period', e.target.value)}
                    required
                    className={formErrors.request_period ? 'border-red-500' : ''}
                  />
                  {formErrors.request_period && (
                    <p className="text-sm text-red-600">{formErrors.request_period}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="request_title">Judul Laporan</Label>
                  <Input
                    id="request_title"
                    type="text"
                    value={formData.request_title}
                    onChange={(e) => handleInputChange('request_title', e.target.value)}
                    placeholder="Contoh: Rekap Lembur Bulan Agustus 2025"
                    className={formErrors.request_title ? 'border-red-500' : ''}
                  />
                  {formErrors.request_title && (
                    <p className="text-sm text-red-600">{formErrors.request_title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="request_description">Deskripsi Laporan</Label>
                  <textarea
                    id="request_description"
                    value={formData.request_description}
                    onChange={(e) => handleInputChange('request_description', e.target.value)}
                    placeholder="Jelaskan detail laporan lembur yang diminta, tujuan, dan penggunaan data..."
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.request_description ? 'border-red-500' : ''}`}
                    rows={4}
                  />
                  {formErrors.request_description && (
                    <p className="text-sm text-red-600">{formErrors.request_description}</p>
                  )}
                </div>

                {/* Informasi */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">
                    <strong>Informasi:</strong> Sistem akan otomatis mengambil data lembur bulanan untuk periode yang dipilih
                    dan memasukkannya ke dalam laporan rekap.
                  </p>
                </div>

                {/* Error Message */}
                {formErrors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{formErrors.general}</p>
                  </div>
                )}

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
                    {submitting ? 'Mengajukan...' : 'Ajukan Rekap Lembur'}
                  </Button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
          <p className="text-green-600 text-sm mt-1">
            Pengajuan Anda akan diproses dan menunggu approval dari supervisor
          </p>
        </div>
      )}

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Rekap Lembur Bulanan</CardTitle>
          <CardDescription>
            Pantau status pengajuan rekap lembur bulanan Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Belum ada pengajuan rekap bulanan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b">
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="text-left py-3 px-4 font-medium text-gray-700"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
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
                        <td key={cell.id} className="py-3 px-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
