"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PotentialOvertimeRecord = {
  date_local: string;
  weekday: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_work_minutes: number;
  required_minutes: number;
  overtime_threshold_minutes: number;
  potential_overtime_minutes: number;
  potential_overtime_hours: number;
  potential_overtime_amount: number;
  is_holiday: boolean;
  within_geofence: boolean;
  can_submit: boolean;
};

type PotentialOvertimeResponse = {
  start_date: string;
  end_date: string;
  overtime_threshold_minutes: number;
  total_potential_records: number;
  total_potential_hours: number;
  total_potential_amount: number;
  potential_records: PotentialOvertimeRecord[];
};

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

function formatWorkHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours > 0 && mins > 0) {
    return `${hours}j ${mins}m`;
  } else if (hours > 0) {
    return `${hours}j`;
  } else if (mins > 0) {
    return `${mins}m`;
  }
  
  return '0m';
}

interface PotentialOvertimeTableProps {
  onQuickSubmit?: (date: string, hours: number, defaultDescription: string) => void;
}

export default function PotentialOvertimeTable({ onQuickSubmit }: PotentialOvertimeTableProps) {
  const [data, setData] = useState<PotentialOvertimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setDateRange({
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (dateRange.start_date && dateRange.end_date) {
      fetchPotentialOvertime();
    }
  }, [dateRange]);

  const fetchPotentialOvertime = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (dateRange.start_date) queryParams.append('start_date', dateRange.start_date);
      if (dateRange.end_date) queryParams.append('end_date', dateRange.end_date);

      const response = await fetch(`/api/overtime-requests/potential?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch potential overtime data');
      }

      const result: PotentialOvertimeResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch potential overtime data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = (record: PotentialOvertimeRecord) => {
    if (onQuickSubmit) {
      const defaultDescription = `Lembur pada ${formatDate(record.date_local)} - Bekerja ${formatWorkHours(record.total_work_minutes)} (lebih ${record.potential_overtime_hours}j dari jam kerja normal)`;
      onQuickSubmit(record.date_local, record.potential_overtime_hours, defaultDescription);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potensi Lembur</CardTitle>
          <CardDescription>Loading potential overtime data...</CardDescription>
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
          <CardTitle>Potensi Lembur</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-center py-4">
            {error}
            <button 
              onClick={fetchPotentialOvertime}
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
    <Card>
      <CardHeader>
        <CardTitle>Potensi Pengajuan Lembur</CardTitle>
        <CardDescription>
          Hari-hari dimana Anda bekerja lebih dari jam kerja normal + buffer {data?.overtime_threshold_minutes || 60} menit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Range Filter */}
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="start_date">Dari Tanggal</Label>
            <Input
              id="start_date"
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Sampai Tanggal</Label>
            <Input
              id="end_date"
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
          <Button onClick={fetchPotentialOvertime} variant="outline">
            Filter
          </Button>
        </div>

        {/* Summary */}
        {data && data.total_potential_records > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.total_potential_records}</div>
              <div className="text-sm text-gray-600">Hari Berpotensi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.total_potential_hours.toFixed(1)}j</div>
              <div className="text-sm text-gray-600">Total Jam Potensi</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(data.total_potential_amount)}</div>
              <div className="text-sm text-gray-600">Total Potensi Gaji</div>
            </div>
          </div>
        )}

        {/* Table */}
        {data && data.potential_records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Tanggal</th>
                  <th className="text-left py-3 px-2">Jam Kerja</th>
                  <th className="text-left py-3 px-2">Jam Normal</th>
                  <th className="text-left py-3 px-2">Potensi Lembur</th>
                  <th className="text-left py-3 px-2">Potensi Gaji</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.potential_records.map((record, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="font-medium">{formatDate(record.date_local)}</div>
                      <div className="text-xs text-gray-500">{record.weekday}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-blue-600">
                        {formatWorkHours(record.total_work_minutes)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {record.check_in_time} - {record.check_out_time}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-sm">
                        {formatWorkHours(record.required_minutes)}
                      </div>
                      <div className="text-xs text-gray-500">
                        + {record.overtime_threshold_minutes}m buffer
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-green-600">
                        {record.potential_overtime_hours.toFixed(1)}j
                      </div>
                      <div className="text-xs text-gray-500">
                        ({record.potential_overtime_minutes}m)
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-green-600">
                        {formatCurrency(record.potential_overtime_amount)}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col space-y-1">
                        {record.is_holiday && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                            Hari Libur
                          </span>
                        )}
                        {!record.within_geofence && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                            Di Luar Area
                          </span>
                        )}
                        {record.within_geofence && !record.is_holiday && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                            Normal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {record.can_submit && onQuickSubmit && (
                        <Button
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={() => handleQuickSubmit(record)}
                        >
                          Ajukan
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">Tidak ada potensi lembur ditemukan</p>
            <p className="text-sm">Untuk periode {dateRange.start_date} sampai {dateRange.end_date}</p>
            <p className="text-sm text-blue-600 mt-2">
              Potensi lembur muncul jika Anda bekerja lebih dari jam normal + {data?.overtime_threshold_minutes || 60} menit buffer
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
