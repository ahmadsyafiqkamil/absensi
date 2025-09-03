"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from '@/lib/authFetch';
import { BACKEND_BASE_URL } from '@/lib/backend';
import Link from 'next/link';

type OvertimeSummary = {
  total_requests: number;
  pending_requests: number;
  level1_approved_requests: number;
  approved_requests: number;
  rejected_requests: number;
  total_approved_hours: number;
  total_approved_amount: number;
};

export default function AdminApprovalSummary() {
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
      
      const response = await authFetch(`${BACKEND_BASE_URL}/api/overtime-requests/summary/`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch overtime summary');
      }

      const data: OvertimeSummary = await response.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overtime summary');
    } finally {
      setLoading(false);
    }
  };

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overtime Approval Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overtime Approval Summary</h2>
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">
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
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Overtime Approval Summary</h2>
        <Link href="/admin/overtime-requests" className="text-blue-600 hover:underline text-sm">
          View All Requests →
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{summary.pending_requests}</div>
            <div className="text-sm text-gray-600">Pending Requests</div>
            <div className="text-xs text-gray-500 mt-1">Need Level 1 approval</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{summary.level1_approved_requests}</div>
            <div className="text-sm text-gray-600">Level 1 Approved</div>
            <div className="text-xs text-gray-500 mt-1">Need final approval</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{summary.approved_requests}</div>
            <div className="text-sm text-gray-600">Final Approved</div>
            <div className="text-xs text-gray-500 mt-1">Ready for payment</div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{summary.rejected_requests}</div>
            <div className="text-sm text-gray-600">Rejected</div>
            <div className="text-xs text-gray-500 mt-1">Not approved</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Approved Hours</CardTitle>
            <CardDescription>Hours approved for overtime payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {summary.total_approved_hours.toFixed(1)}j
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Approved Amount</CardTitle>
            <CardDescription>Total overtime payment amount</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.total_approved_amount)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
