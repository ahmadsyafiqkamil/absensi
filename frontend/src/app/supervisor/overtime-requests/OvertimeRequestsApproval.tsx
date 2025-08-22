"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from '@radix-ui/react-dialog';

type Employee = {
  id: number;
  nip: string;
  fullname: string | null;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  division: {
    id: number;
    name: string;
  } | null;
  position: {
    id: number;
    name: string;
  } | null;
};

type OvertimeRequest = {
  id: number;
  employee: Employee;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
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

function getEmployeeName(employee: Employee): string {
  if (employee.fullname) {
    return employee.fullname;
  }
  const user = employee.user;
  if (user.first_name || user.last_name) {
    return `${user.first_name} ${user.last_name}`.trim();
  }
  return user.username;
}

export default function OvertimeRequestsApproval() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const [requestsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/overtime-requests/?${queryParams.toString()}`),
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

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const endpoint = `/api/overtime-requests/${selectedRequest.id}/${actionType}/`;
      const body = actionType === 'reject' ? { rejection_reason: rejectionReason } : {};

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${actionType} overtime request`);
      }

      // Close modal and refresh data
      setIsModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${actionType} overtime request`);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (request: OvertimeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Persetujuan Pengajuan Lembur</CardTitle>
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
          <CardTitle>Persetujuan Pengajuan Lembur</CardTitle>
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
                Perlu ditinjau
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

      {/* Filter and Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Daftar Pengajuan Lembur</h2>
        <div className="flex items-center space-x-4">
          <Label htmlFor="status-filter" className="text-sm font-medium">Filter:</Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Overtime Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Lembur Tim</CardTitle>
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
              <p className="text-sm">Pengajuan dari tim akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Karyawan</th>
                    <th className="text-left py-3 px-2">Tanggal</th>
                    <th className="text-left py-3 px-2">Jam Lembur</th>
                    <th className="text-left py-3 px-2">Deskripsi Pekerjaan</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Gaji Lembur</th>
                    <th className="text-left py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium">{getEmployeeName(request.employee)}</div>
                        <div className="text-xs text-gray-500">
                          {request.employee.division?.name || 'No Division'} • {request.employee.nip}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium">{formatDate(request.date_requested)}</div>
                        <div className="text-xs text-gray-500">
                          Diajukan: {formatDateTime(request.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="font-medium text-blue-600">
                          {parseFloat(request.overtime_hours).toFixed(1)}j
                        </div>
                      </td>
                      <td className="py-3 px-2 max-w-xs">
                        <div className="text-sm line-clamp-3" title={request.work_description}>
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
                        {request.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                              onClick={() => openActionModal(request, 'approve')}
                            >
                              Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2 py-1"
                              onClick={() => openActionModal(request, 'reject')}
                            >
                              Tolak
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {request.status === 'approved' ? 'Sudah disetujui' : 'Sudah ditolak'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-[500px] max-w-[95vw] p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {actionType === 'approve' ? 'Setujui Pengajuan Lembur' : 'Tolak Pengajuan Lembur'}
            </Dialog.Title>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Karyawan:</span>
                      <div>{getEmployeeName(selectedRequest.employee)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Tanggal:</span>
                      <div>{formatDate(selectedRequest.date_requested)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Jam Lembur:</span>
                      <div>{parseFloat(selectedRequest.overtime_hours).toFixed(1)} jam</div>
                    </div>
                    <div>
                      <span className="font-medium">Gaji Lembur:</span>
                      <div>{formatCurrency(selectedRequest.overtime_amount)}</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium">Deskripsi Pekerjaan:</span>
                    <div className="mt-1 text-sm">{selectedRequest.work_description}</div>
                  </div>
                </div>

                {actionType === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
                    <textarea
                      id="rejection_reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Jelaskan alasan penolakan pengajuan lembur ini..."
                      required
                    />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleAction}
                    disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                    className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'bg-red-600 hover:bg-red-700 flex-1'}
                  >
                    {processing 
                      ? (actionType === 'approve' ? 'Menyetujui...' : 'Menolak...') 
                      : (actionType === 'approve' ? 'Setujui Pengajuan' : 'Tolak Pengajuan')
                    }
                  </Button>
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline" disabled={processing}>
                      Batal
                    </Button>
                  </Dialog.Close>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
