"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { authFetch } from '@/lib/authFetch';

type MonthlyExportRequest = {
  id: number;
  employee: {
    id: number;
    user: {
      username: string;
      first_name: string;
      last_name: string;
    };
    division: {
      name: string;
    };
    position: {
      name: string;
    };
  };
  export_period: string;
  export_type: string;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected' | 'exported' | 'failed';
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
  exported_file_path: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
};

type MonthlyExportResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MonthlyExportRequest[];
};

export default function MonthlyExportApprovalManager() {
  const [exportRequests, setExportRequests] = useState<MonthlyExportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

  useEffect(() => {
    fetchExportRequests();
  }, []);

  const fetchExportRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
                        const response = await authFetch('/api/overtime-requests/monthly_exports/');
      
      if (!response.ok) {
        throw new Error('Failed to fetch monthly export requests');
      }

      const data: MonthlyExportResponse = await response.json();
      setExportRequests(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monthly export requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number, level: 'level1' | 'final') => {
    try {
      setApproving(requestId);
      setError(null);
      setSuccessMessage(null);
      
                        const response = await authFetch(`/api/overtime-requests/monthly_exports/${requestId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to approve export request');
      }

      setSuccessMessage(`Export request berhasil disetujui level ${level === 'level1' ? '1' : '2'}!`);
      await fetchExportRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve export request');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!rejectionReason.trim()) {
      setError('Alasan penolakan harus diisi');
      return;
    }

    try {
      setRejecting(requestId);
      setError(null);
      setSuccessMessage(null);
      
                        const response = await authFetch(`/api/overtime-requests/monthly_exports/${requestId}/reject/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to reject export request');
      }

      setSuccessMessage('Export request berhasil ditolak!');
      setRejectionReason('');
      setShowRejectModal(null);
      await fetchExportRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject export request');
    } finally {
      setRejecting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Menunggu Approval', color: 'bg-yellow-100 text-yellow-800' },
      level1_approved: { label: 'Level 1 Approved', color: 'bg-blue-100 text-blue-800' },
      approved: { label: 'Final Approved', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' },
      exported: { label: 'Berhasil Export', color: 'bg-purple-100 text-purple-800' },
      failed: { label: 'Export Gagal', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const canApproveLevel1 = (request: MonthlyExportRequest) => {
    return request.status === 'pending';
  };

  const canApproveFinal = (request: MonthlyExportRequest) => {
    return request.status === 'level1_approved';
  };

  const canReject = (request: MonthlyExportRequest) => {
    return request.status === 'pending' || request.status === 'level1_approved';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Approval Export Data Lembur Bulanan
        </CardTitle>
        <CardDescription>
          Kelola approval untuk export data lembur bulanan dengan 2-level approval system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
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

        {/* Error Message */}
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

        {/* Approval Flow Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">🔄 Flow Approval Export Bulanan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">1</div>
              <p className="font-medium text-blue-800">Pegawai Ajukan</p>
              <p className="text-blue-600">Request export data bulanan</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">2</div>
              <p className="font-medium text-blue-800">Level 1: Supervisor Divisi</p>
              <p className="text-blue-600">Approve data lembur divisi</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2">3</div>
              <p className="font-medium text-blue-800">Level 2: Supervisor Organisasi</p>
              <p className="text-blue-600">Final approval & generate file</p>
            </div>
          </div>
        </div>

        {/* Export Requests List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">📋 Daftar Permintaan Export</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Memuat data...</p>
            </div>
          ) : exportRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Belum ada permintaan export bulanan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {exportRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">
                        Export {formatPeriod(request.export_period)}
                      </h4>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(request.created_at)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600">Pegawai:</p>
                      <p className="font-medium">
                        {request.employee.user.first_name} {request.employee.user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">@{request.employee.user.username}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-600">Divisi & Jabatan:</p>
                      <p className="font-medium">{request.employee.division.name}</p>
                      <p className="text-xs text-gray-500">{request.employee.position.name}</p>
                    </div>
                    
                    {request.level1_approved_by && (
                      <div>
                        <p className="text-gray-600">Level 1 Approved By:</p>
                        <p className="font-medium">
                          {request.level1_approved_by.first_name} {request.level1_approved_by.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.level1_approved_at ? formatDate(request.level1_approved_at) : ''}
                        </p>
                      </div>
                    )}
                    
                    {request.final_approved_by && (
                      <div>
                        <p className="text-gray-600">Final Approved By:</p>
                        <p className="font-medium">
                          {request.final_approved_by.first_name} {request.final_approved_by.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {request.final_approved_at ? formatDate(request.final_approved_at) : ''}
                        </p>
                      </div>
                    )}
                    
                    {request.rejection_reason && (
                      <div className="md:col-span-2">
                        <p className="text-gray-600">Alasan Penolakan:</p>
                        <p className="text-red-600">{request.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-3 border-t">
                    {canApproveLevel1(request) && (
                      <Button
                        onClick={() => handleApprove(request.id, 'level1')}
                        disabled={approving === request.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {approving === request.id ? '⏳ Approving...' : '✅ Approve Level 1'}
                      </Button>
                    )}
                    
                    {canApproveFinal(request) && (
                      <Button
                        onClick={() => handleApprove(request.id, 'final')}
                        disabled={approving === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {approving === request.id ? '⏳ Approving...' : '✅ Approve Final'}
                      </Button>
                    )}
                    
                    {canReject(request) && (
                      <Button
                        onClick={() => setShowRejectModal(request.id)}
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        ❌ Reject
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Tolak Export Request</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rejection_reason">Alasan Penolakan *</Label>
                  <Textarea
                    id="rejection_reason"
                    value={rejectionReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                    placeholder="Jelaskan alasan penolakan..."
                    rows={4}
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(null);
                      setRejectionReason('');
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => handleReject(showRejectModal)}
                    disabled={rejecting === showRejectModal || !rejectionReason.trim()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {rejecting === showRejectModal ? '⏳ Rejecting...' : 'Tolak'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
