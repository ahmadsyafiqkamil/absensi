"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OvertimeRequestsTable from './OvertimeRequestsTable';
import { authFetch } from '@/lib/authFetch';

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

export default function OvertimeRequestsApproval() {
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summaryResponse = await authFetch('/api/overtime-requests/summary/');

      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch overtime summary');
      }

      const summaryData: OvertimeSummary = await summaryResponse.json();
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overtime summary');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSummary();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Persetujuan Pengajuan Lembur</CardTitle>
          <CardDescription>Loading overtime data...</CardDescription>
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
              onClick={fetchSummary}
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
      {/* {summary && (
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
                Perlu ditinjau
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
      )} */}

      {/* TanStack Table */}
      <OvertimeRequestsTable onRefresh={handleRefresh} />
    </div>
  );
}
