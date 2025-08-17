"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OvertimeStatus } from "@/components/ui/overtime-status";

type OvertimeData = {
  summary: {
    total_records: number;
    total_overtime_minutes: number;
    total_overtime_amount: number;
    pending_overtime_count: number;
    average_overtime_per_day: number;
  };
  overtime_records: Array<{
    id: number;
    date: string;
    weekday: string;
    check_in: string | null;
    check_out: string | null;
    total_work_minutes: number;
    required_minutes: number;
    overtime_minutes: number;
    overtime_amount: number;
    is_holiday: boolean;
    overtime_approved: boolean;
    approved_by: string | null;
    approved_at: string | null;
  }>;
};

function formatWorkHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  // Handle edge case where minutes rounds up to 60
  if (mins === 60) {
    return `${hours + 1}j`;
  }
  
  if (hours > 0 && mins > 0) {
    return `${hours}j ${mins}m`;
  } else if (hours > 0) {
    return `${hours}j`;
  } else if (mins > 0) {
    return `${mins}m`;
  }
  
  return '0m';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

function formatTime(timeString: string | null): string {
  if (!timeString) return '-';
  const date = new Date(timeString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function OvertimeSummary() {
  const [overtimeData, setOvertimeData] = useState<OvertimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOvertimeData();
  }, []);

  const fetchOvertimeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/overtime/report');
      if (!response.ok) {
        throw new Error('Failed to fetch overtime data');
      }
      
      const data = await response.json();
      setOvertimeData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overtime data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overtime Summary</CardTitle>
          <CardDescription>Loading overtime information...</CardDescription>
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
          <CardTitle>Overtime Summary</CardTitle>
          <CardDescription>Error loading overtime data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-center py-4">
            {error}
            <button 
              onClick={fetchOvertimeData}
              className="ml-2 text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overtimeData || overtimeData.summary.total_records === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Overtime Summary</CardTitle>
          <CardDescription>No overtime records found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">Belum ada data overtime</p>
            <p className="text-sm">Overtime akan muncul setelah Anda bekerja melebihi jam kerja normal</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary, overtime_records } = overtimeData;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatWorkHours(summary.total_overtime_minutes)}
            </div>
            <p className="text-xs text-gray-500">
              {summary.total_records} hari kerja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Gaji Overtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_overtime_amount)}
            </div>
            <p className="text-xs text-gray-500">
              Rata-rata {formatCurrency(summary.average_overtime_per_day)} per hari
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.pending_overtime_count}
            </div>
            <p className="text-xs text-gray-500">
              Menunggu approval supervisor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rata-rata per Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatWorkHours(summary.average_overtime_per_day)}
            </div>
            <p className="text-xs text-gray-500">
              Overtime per hari kerja
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Overtime</CardTitle>
          <CardDescription>Detail overtime per hari kerja</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Tanggal</th>
                  <th className="text-left py-2 px-2">Jam Kerja</th>
                  <th className="text-left py-2 px-2">Overtime</th>
                  <th className="text-left py-2 px-2">Gaji Overtime</th>
                  <th className="text-left py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {overtime_records.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="font-medium">{formatDate(record.date)}</div>
                      <div className="text-xs text-gray-500">{record.weekday}</div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-sm">
                        {formatTime(record.check_in)} - {formatTime(record.check_out)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total: {formatWorkHours(record.total_work_minutes)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Normal: {formatWorkHours(record.required_minutes)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-medium text-blue-600">
                        {formatWorkHours(record.overtime_minutes)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-medium text-green-600">
                        {formatCurrency(record.overtime_amount)}
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center">
                        <OvertimeStatus approved={record.overtime_approved} />
                        {record.approved_by && record.overtime_approved && (
                          <div className="ml-2 text-xs text-gray-500">
                            by {record.approved_by}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
