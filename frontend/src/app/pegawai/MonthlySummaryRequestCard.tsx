"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import * as Dialog from '@radix-ui/react-dialog';
import { authFetch } from '@/lib/authFetch';

type MonthlySummaryRequest = {
  id: number;
  request_period: string;
  report_type: string;
  request_title: string;
  request_description: string;
  include_attendance: boolean;
  include_overtime: boolean;
  include_corrections: boolean;
  include_summary_stats: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expected_completion_date: string;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected' | 'completed' | 'cancelled';
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

type MonthlySummaryRequestsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MonthlySummaryRequest[];
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
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

function getStatusBadge(status: string) {
  const statusConfig = {
    pending: { color: 'bg-orange-100 text-orange-800', text: 'Menunggu Approval' },
    level1_approved: { color: 'bg-blue-100 text-blue-800', text: 'Level 1 Disetujui' },
    approved: { color: 'bg-green-100 text-green-800', text: 'Final Disetujui' },
    rejected: { color: 'bg-red-100 text-red-800', text: 'Ditolak' },
    completed: { color: 'bg-purple-100 text-purple-800', text: 'Selesai' },
    cancelled: { color: 'bg-gray-100 text-gray-800', text: 'Dibatalkan' },
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  return <Badge className={config.color}>{config.text}</Badge>;
}

function getPriorityBadge(priority: string) {
  const priorityConfig = {
    low: { color: 'bg-gray-100 text-gray-800', text: 'Rendah' },
    medium: { color: 'bg-blue-100 text-blue-800', text: 'Sedang' },
    high: { color: 'bg-orange-100 text-orange-800', text: 'Tinggi' },
    urgent: { color: 'bg-red-100 text-red-800', text: 'Urgent' },
  };
  
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  return <Badge className={config.color}>{config.text}</Badge>;
}

export default function MonthlySummaryRequestCard() {
  const [requests, setRequests] = useState<MonthlySummaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    request_period: '',
    report_type: 'monthly_summary',
    request_title: '',
    request_description: '',
    include_attendance: true,
    include_overtime: true,
    include_corrections: false,
    include_summary_stats: true,
    priority: 'medium' as const,
    expected_completion_date: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch('/api/employee/monthly-summary-requests/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch monthly summary requests');
      }

      const data: MonthlySummaryRequestsResponse = await response.json();
      setRequests(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monthly summary requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});

    try {
      const response = await authFetch('/api/employee/monthly-summary-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData) {
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
        throw new Error('Failed to submit monthly summary request');
      }

      // Reset form and close modal
      setFormData({
        request_period: '',
        report_type: 'monthly_summary',
        request_title: '',
        request_description: '',
        include_attendance: true,
        include_overtime: true,
        include_corrections: false,
        include_summary_stats: true,
        priority: 'medium',
        expected_completion_date: '',
      });
      setIsModalOpen(false);
      
      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit monthly summary request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Rekap Bulanan</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Pengajuan Rekap Bulanan</CardTitle>
            <CardDescription>
              {requests.length > 0 
                ? `Menampilkan ${requests.length} pengajuan rekap bulanan` 
                : 'Belum ada pengajuan rekap bulanan'
              }
            </CardDescription>
          </div>
          <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Dialog.Trigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="request_period">Periode Laporan *</Label>
                      <Input
                        id="request_period"
                        name="request_period"
                        type="month"
                        value={formData.request_period}
                        onChange={handleInputChange}
                        className={formErrors.request_period ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.request_period && (
                        <p className="text-sm text-red-600">{formErrors.request_period}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Prioritas</Label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="low">Rendah</option>
                        <option value="medium">Sedang</option>
                        <option value="high">Tinggi</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request_title">Judul Laporan *</Label>
                    <Input
                      id="request_title"
                      name="request_title"
                      value={formData.request_title}
                      onChange={handleInputChange}
                      placeholder="Contoh: Rekap Absensi dan Lembur Bulan Agustus 2025"
                      className={formErrors.request_title ? 'border-red-500' : ''}
                      required
                    />
                    {formErrors.request_title && (
                      <p className="text-sm text-red-600">{formErrors.request_title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="request_description">Deskripsi Laporan</Label>
                    <textarea
                      id="request_description"
                      name="request_description"
                      value={formData.request_description}
                      onChange={handleInputChange}
                      placeholder="Jelaskan detail laporan yang diminta..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expected_completion_date">Target Selesai</Label>
                    <Input
                      id="expected_completion_date"
                      name="expected_completion_date"
                      type="date"
                      value={formData.expected_completion_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Data yang Dimasukkan:</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="include_attendance"
                          checked={formData.include_attendance}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm">Data Absensi</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="include_overtime"
                          checked={formData.include_overtime}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm">Data Lembur</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="include_corrections"
                          checked={formData.include_corrections}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm">Data Perbaikan</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="include_summary_stats"
                          checked={formData.include_summary_stats}
                          onChange={handleInputChange}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm">Statistik Ringkasan</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Dialog.Close asChild>
                      <Button type="button" variant="outline">
                        Batal
                      </Button>
                    </Dialog.Close>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={submitting}
                    >
                      {submitting ? 'Mengajukan...' : 'Ajukan Rekap Bulanan'}
                    </Button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
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

        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2">Belum ada pengajuan rekap bulanan</p>
            <p className="text-sm">Klik tombol &quot;Ajukan Rekap Bulanan&quot; untuk membuat pengajuan baru</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.request_title}</h3>
                    <p className="text-sm text-gray-600">{request.request_description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {getPriorityBadge(request.priority)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Periode:</span>
                    <p className="text-gray-900">{formatDate(request.request_period)}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Data Scope:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.include_attendance && <Badge variant="outline" className="text-xs">Absensi</Badge>}
                      {request.include_overtime && <Badge variant="outline" className="text-xs">Lembur</Badge>}
                      {request.include_corrections && <Badge variant="outline" className="text-xs">Perbaikan</Badge>}
                      {request.include_summary_stats && <Badge variant="outline" className="text-xs">Statistik</Badge>}
                    </div>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Target Selesai:</span>
                    <p className="text-gray-900">
                      {request.expected_completion_date 
                        ? formatDate(request.expected_completion_date)
                        : 'Tidak ditentukan'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Dibuat:</span>
                    <p className="text-gray-900">{formatDateTime(request.created_at)}</p>
                  </div>
                </div>

                {/* Approval Status */}
                {request.status !== 'pending' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {request.level1_approved_by && (
                        <div>
                          <span className="font-medium text-gray-700">Level 1 Approval:</span>
                          <p className="text-gray-900">
                            {request.level1_approved_by.first_name || request.level1_approved_by.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.level1_approved_at && formatDateTime(request.level1_approved_at)}
                          </p>
                        </div>
                      )}
                      
                      {request.final_approved_by && (
                        <div>
                          <span className="font-medium text-gray-700">Final Approval:</span>
                          <p className="text-gray-900">
                            {request.final_approved_by.first_name || request.final_approved_by.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {request.final_approved_at && formatDateTime(request.final_approved_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {request.rejection_reason && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <span className="font-medium text-red-800">Alasan Penolakan:</span>
                      <p className="text-red-700 mt-1">{request.rejection_reason}</p>
                    </div>
                  </div>
                )}

                {/* Completion Notes */}
                {request.completion_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <span className="font-medium text-green-800">Catatan Penyelesaian:</span>
                      <p className="text-green-700 mt-1">{request.completion_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
