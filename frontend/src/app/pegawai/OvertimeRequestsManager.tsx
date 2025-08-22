"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from '@radix-ui/react-dialog';
import PotentialOvertimeTable from './PotentialOvertimeTable';

type OvertimeRequest = {
  id: number;
  date_requested: string;
  overtime_hours: string;
  work_description: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  approved_at: string | null;
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
  approved_requests: number;
  rejected_requests: number;
  total_approved_hours: number;
  total_approved_amount: number;
};

function formatCurrency(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
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
      return 'Disetujui';
    case 'rejected':
      return 'Ditolak';
    case 'pending':
    default:
      return 'Menunggu';
  }
}

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [requestsResponse, summaryResponse] = await Promise.all([
        fetch('/api/overtime-requests/'),
        fetch('/api/overtime-requests/summary/')
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
      const response = await fetch('/api/overtime-requests/', {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Potential Overtime Table */}
      <PotentialOvertimeTable onQuickSubmit={handleQuickSubmit} />

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Riwayat Pengajuan Lembur</h2>
        <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Dialog.Trigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Ajukan Lembur
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-[500px] max-w-[95vw] p-6 z-50">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Pengajuan Lembur
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mb-6">
                Isi form di bawah untuk mengajukan lembur. Pastikan data yang diisi sudah benar.
              </Dialog.Description>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date_requested">Tanggal Lembur</Label>
                  <Input
                    id="date_requested"
                    name="date_requested"
                    type="date"
                    value={formData.date_requested}
                    onChange={handleInputChange}
                    required
                  />
                  {formErrors.date_requested && (
                    <p className="text-sm text-red-600">{formErrors.date_requested}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overtime_hours">Jam Lembur</Label>
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
                    required
                  />
                  {formErrors.overtime_hours && (
                    <p className="text-sm text-red-600">{formErrors.overtime_hours}</p>
                  )}
                  <p className="text-xs text-gray-500">Maksimal 12 jam per hari</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="work_description">Deskripsi Pekerjaan</Label>
                  <textarea
                    id="work_description"
                    name="work_description"
                    value={formData.work_description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Jelaskan pekerjaan yang dilakukan selama lembur..."
                    required
                  />
                  {formErrors.work_description && (
                    <p className="text-sm text-red-600">{formErrors.work_description}</p>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Mengajukan...' : 'Ajukan Lembur'}
                  </Button>
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" disabled={submitting}>
                      Batal
                    </Button>
                  </Dialog.Close>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
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
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">Belum ada pengajuan lembur</p>
              <p className="text-sm">Klik tombol "Ajukan Lembur" untuk membuat pengajuan baru</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Tanggal</th>
                    <th className="text-left py-3 px-2">Jam Lembur</th>
                    <th className="text-left py-3 px-2">Deskripsi Pekerjaan</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Gaji Lembur</th>
                    <th className="text-left py-3 px-2">Diajukan</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium">{formatDate(request.date_requested)}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-blue-600">
                          {parseFloat(request.overtime_hours).toFixed(1)}j
                        </div>
                      </td>
                      <td className="py-3 px-2 max-w-xs">
                        <div className="text-sm line-clamp-2" title={request.work_description}>
                          {request.work_description}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusText(request.status)}
                          </span>
                          {request.status === 'approved' && request.approved_by && (
                            <div className="text-xs text-gray-500">
                              oleh {request.approved_by.username}
                            </div>
                          )}
                          {request.status === 'rejected' && request.rejection_reason && (
                            <div className="text-xs text-red-600" title={request.rejection_reason}>
                              Alasan: {request.rejection_reason.length > 30 
                                ? request.rejection_reason.substring(0, 30) + '...' 
                                : request.rejection_reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-green-600">
                          {formatCurrency(request.overtime_amount)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-xs text-gray-500">
                          {formatDateTime(request.created_at)}
                        </div>
                      </td>
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
