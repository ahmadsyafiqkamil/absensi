"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PotentialOvertimeRecord = {
  date_local: string;
  weekday: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_work_minutes: number;
  required_minutes: number;
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
  timezone: string;
  total_potential_records: number;
  total_potential_hours: number;
  total_potential_amount: number;
  potential_records: PotentialOvertimeRecord[];
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

function formatTime(timeString: string | null, timezone: string = 'Asia/Dubai'): string {
  if (!timeString) return '-';
  try {
    // If timeString is already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    // If it's an ISO string, convert to local timezone
    const date = new Date(timeString);
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: timezone 
    });
  } catch {
    return timeString || '-';
  }
}

interface PotentialOvertimeTableProps {
  onQuickSubmit?: (date: string, hours: number, defaultDescription: string) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

const columnHelper = createColumnHelper<PotentialOvertimeRecord>();

export default function PotentialOvertimeTable({ onQuickSubmit, refreshTrigger }: PotentialOvertimeTableProps) {
  const [data, setData] = useState<PotentialOvertimeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

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

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && dateRange.start_date && dateRange.end_date) {
      fetchPotentialOvertime();
    }
  }, [refreshTrigger]);

  const fetchPotentialOvertime = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (dateRange.start_date) queryParams.append('start_date', dateRange.start_date);
      if (dateRange.end_date) queryParams.append('end_date', dateRange.end_date);

      const response = await fetch(`/api/v2/overtime/overtime/potential_overtime/?${queryParams.toString()}`);
      
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

  const columns = [
    columnHelper.accessor('date_local', {
      header: 'Tanggal',
      cell: (info) => (
        <div>
          <div className="font-medium">{formatDate(info.getValue())}</div>
          <div className="text-xs text-gray-500">{info.row.original.weekday}</div>
        </div>
      ),
    }),
    columnHelper.accessor('total_work_minutes', {
      header: 'Jam Kerja',
      cell: (info) => (
        <div>
          <div className="font-medium text-blue-600">
            {formatWorkHours(info.getValue())}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(info.row.original.check_in_time, data?.timezone)} - {formatTime(info.row.original.check_out_time, data?.timezone)}
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('required_minutes', {
      header: 'Jam Normal',
      cell: (info) => (
        <div>
          <div className="text-sm">
            {formatWorkHours(info.getValue())}
          </div>
          <div className="text-xs text-gray-500">
            + {data?.overtime_threshold_minutes ?? 0}m buffer
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('potential_overtime_hours', {
      header: 'Potensi Lembur',
      cell: (info) => (
        <div>
          <div className="font-medium text-green-600">
            {info.getValue().toFixed(1)}j
          </div>
          <div className="text-xs text-gray-500">
            ({info.row.original.potential_overtime_minutes}m)
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('potential_overtime_amount', {
      header: 'Potensi Gaji',
      cell: (info) => (
        <div className="font-medium text-green-600">
          {formatCurrency(info.getValue())}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const record = info.row.original;
        return (
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
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: (info) => {
        const record = info.row.original;
        return record.can_submit && onQuickSubmit ? (
          <Button
            size="sm"
            className="text-xs px-2 py-1"
            onClick={() => handleQuickSubmit(record)}
          >
            Ajukan
          </Button>
        ) : null;
      },
    }),
  ];

  const table = useReactTable({
    data: data?.potential_records || [],
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
          {/* Hari-hari dimana Anda bekerja lebih dari jam kerja normal + buffer {data?.overtime_threshold_minutes ?? 0} menit */}
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

        {/* Global Search */}
        {data && data.potential_records.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Input
              placeholder="Cari data..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <div className="text-sm text-gray-500">
              Menampilkan {table.getFilteredRowModel().rows.length} dari {data.potential_records.length} data
            </div>
          </div>
        )}

        {/* TanStack Table */}
        {data && data.potential_records.length > 0 ? (
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
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2">Tidak ada potensi lembur ditemukan</p>
            <p className="text-sm">Untuk periode {dateRange.start_date} sampai {dateRange.end_date}</p>
            <p className="text-sm text-blue-600 mt-2">
              Potensi lembur muncul jika Anda bekerja lebih dari jam normal + {data?.overtime_threshold_minutes ?? 0} menit buffer
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
