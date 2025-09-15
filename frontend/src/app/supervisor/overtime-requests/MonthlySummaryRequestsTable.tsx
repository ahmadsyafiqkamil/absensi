"use client";

import { useEffect, useState, useMemo } from 'react';
import { authFetch } from '@/lib/authFetch';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
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

type OvertimeSummaryRequest = {
  id: number;
  employee: Employee;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  request_period: string;
  report_type: string;
  request_title: string;
  request_description: string;
  include_attendance: boolean;
  include_overtime: boolean;
  include_corrections: boolean;
  include_summary_stats: boolean;
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
    year: 'numeric',
    month: 'short',
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

function formatPeriod(periodString: string): string {
  const [year, month] = periodString.split('-');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
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

function getEmployeeName(employee?: Employee | null): string {
  if (!employee) return '-';
  if (employee.fullname) {
    return employee.fullname;
  }
  const user = employee.user;
  if (user?.first_name || user?.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user?.username || '-';
  }
  return user?.username || '-';
}

function getReportTypeText(reportType: string): string {
  switch (reportType) {
    case 'monthly_summary':
      return 'Rekap Bulanan';
    case 'overtime_summary':
      return 'Rekap Lembur';
    case 'attendance_summary':
      return 'Rekap Absensi';
    default:
      return reportType;
  }
}

const columnHelper = createColumnHelper<OvertimeSummaryRequest>();

interface OvertimeSummaryRequestsTableProps {
  onRefresh?: () => void;
}

export default function OvertimeSummaryRequestsTable({ onRefresh }: OvertimeSummaryRequestsTableProps) {
  const [data, setData] = useState<OvertimeSummaryRequest[]>([]);
  const [divisions, setDivisions] = useState<{id: number, name: string}[]>([]);
  const [supervisorInfo, setSupervisorInfo] = useState<{isOrgWide: boolean, isAdmin: boolean} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeSummaryRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Custom filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => getEmployeeName(row.original.employee), {
        id: 'employee',
        header: 'Karyawan',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{getEmployeeName(row.original.employee)}</div>
            <div className="text-xs text-gray-500">
              {row.original.employee?.division?.name || 'No Division'} • {row.original.employee?.nip || '-'}
            </div>
          </div>
        ),
        filterFn: 'includesString',
      }),
      columnHelper.accessor('request_period', {
        header: 'Periode',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{formatPeriod(row.original.request_period)}</div>
            <div className="text-xs text-gray-500">
              Diajukan: {formatDateTime(row.original.created_at)}
            </div>
          </div>
        ),
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('request_title', {
        header: 'Judul Laporan',
        cell: ({ getValue }) => (
          <div className="text-sm max-w-xs line-clamp-2" title={getValue()}>
            {getValue() || '-'}
          </div>
        ),
        filterFn: 'includesString',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.original.status)}`}>
              {getStatusText(row.original.status)}
            </span>
            
            {/* Approval workflow indicators */}
            {row.original.status === 'level1_approved' && (
              <div className="text-xs space-y-1">
                <div className="text-green-600">
                  ✓ Level 1: {row.original.level1_approved_by?.username}
                </div>
                <div className="text-orange-500">
                  ⏳ Menunggu Final Approval
                </div>
              </div>
            )}
            
            {row.original.status === 'approved' && (
              <div className="text-xs space-y-1">
                {row.original.level1_approved_by && (
                  <div className="text-green-600">
                    ✓ Level 1: {row.original.level1_approved_by.username}
                  </div>
                )}
                {row.original.final_approved_by && (
                  <div className="text-green-600">
                    ✓ Final: {row.original.final_approved_by.username}
                  </div>
                )}
              </div>
            )}
            
            {row.original.status === 'pending' && (
              <div className="text-xs text-orange-500">
                ⏳ Menunggu Level 1 Approval
              </div>
            )}
            
            {row.original.status === 'rejected' && row.original.rejection_reason && (
              <div className="text-xs text-red-600" title={row.original.rejection_reason}>
                Alasan: {row.original.rejection_reason.length > 30 
                  ? row.original.rejection_reason.substring(0, 30) + '...' 
                  : row.original.rejection_reason}
              </div>
            )}
          </div>
        ),
        filterFn: (row, id, value) => {
          return value === '' || row.getValue(id) === value;
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aksi',
        cell: ({ row }) => {
          const status = row.original.status;
          const isAdmin = supervisorInfo?.isAdmin || false;
          const isOrgWide = supervisorInfo?.isOrgWide || false;
          const isDivisionSupervisor = !isAdmin && !isOrgWide;
          
          let canApprove = false;
          let canReject = false;
          let buttonText = 'Setujui';
          let disabledReason = '';
          
          if (isAdmin) {
            // Admin can approve any status except rejected/approved/completed
            canApprove = status === 'pending' || status === 'level1_approved';
            canReject = status === 'pending' || status === 'level1_approved';
            buttonText = status === 'level1_approved' ? 'Final Approve' : 'Setujui';
          } else if (isOrgWide) {
            // Org-wide supervisor can only final approve after level1_approved
            canApprove = status === 'level1_approved';
            canReject = status === 'pending' || status === 'level1_approved';
            buttonText = 'Final Approve';
            if (status === 'pending') {
              disabledReason = 'Menunggu Level 1 Approval';
              canApprove = false;
            }
          } else if (isDivisionSupervisor) {
            // Division supervisor can only do level 1 approval
            canApprove = status === 'pending';
            canReject = status === 'pending';
            buttonText = 'Level 1 Approve';
          }
          
          if (status === 'approved' || status === 'rejected' || status === 'completed' || status === 'cancelled') {
            return (
              <span className="text-xs text-gray-500">
                {status === 'approved' ? 'Sudah disetujui' : 
                 status === 'rejected' ? 'Sudah ditolak' :
                 status === 'completed' ? 'Sudah selesai' : 'Sudah dibatalkan'}
              </span>
            );
          }
          
          return (
            <div className="flex flex-col space-y-1">
              <div className="flex space-x-2">
                {/* Always show approve button, but control its state */}
                <Button
                  size="sm"
                  disabled={!canApprove}
                  className={`text-xs px-2 py-1 ${
                    canApprove 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={canApprove ? () => openActionModal(row.original, 'approve') : undefined}
                  title={disabledReason || buttonText}
                >
                  {buttonText}
                </Button>
                
                {canReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs px-2 py-1"
                    onClick={() => openActionModal(row.original, 'reject')}
                  >
                    Tolak
                  </Button>
                )}
              </div>
              {disabledReason && (
                <span className="text-xs text-gray-500 italic">
                  {disabledReason}
                </span>
              )}
            </div>
          );
        },
      }),
    ],
    [supervisorInfo]
  );

  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    // Division filter
    if (divisionFilter) {
      filtered = filtered.filter(item => 
        (item.employee?.division?.id?.toString?.() || '') === divisionFilter
      );
    }
    
    // Period filter
    if (periodFilter) {
      filtered = filtered.filter(item => item.request_period === periodFilter);
    }
    
    return filtered;
  }, [data, statusFilter, divisionFilter, periodFilter]);

  const table = useReactTable({
    data: filteredData,
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
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data individually to avoid Promise.all issues
      const monthlySummaryResponse = await authFetch(`/api/v2/overtime/monthly-summary/`);
      const divisionsResponse = await authFetch(`/api/v2/employees/divisions/`);
      const supervisorResponse = await authFetch(`/api/v2/overtime/summary/`);

      if (!monthlySummaryResponse.ok) {
        throw new Error('Failed to fetch monthly summary requests');
      }

      const monthlySummaryData: any = await monthlySummaryResponse.json();
      const monthlyItems: OvertimeSummaryRequest[] = Array.isArray(monthlySummaryData)
        ? monthlySummaryData
        : (monthlySummaryData?.results ?? []);
      setData(monthlyItems);

      // Fetch supervisor info (optional, for determining role)
      if (supervisorResponse.ok) {
        const supervisorData = await supervisorResponse.json();
        setSupervisorInfo({
          isOrgWide: supervisorData.can_approve_overtime_org_wide || false,
          isAdmin: false // This endpoint is for supervisors, so not admin
        });
      } else {
        // Fallback: assume division supervisor
        setSupervisorInfo({
          isOrgWide: false,
          isAdmin: false
        });
      }

      // Fetch divisions (optional, don't fail if it doesn't work)
      if (divisionsResponse.ok) {
        const divisionsData = await divisionsResponse.json();
        // Extract unique divisions from the monthly summary data and merge with API data
        const uniqueDivisions = Array.from(
          new Map([
            ...monthlyItems
              .filter(req => req?.employee?.division)
              .map(req => [req.employee!.division!.id, req.employee!.division!]),
            ...(divisionsData.results || divisionsData || []).map((div: any) => [div.id, div])
          ].filter(([_, division]) => division)).values()
        );
        setDivisions(uniqueDivisions as {id: number, name: string}[]);
      } else {
        // Fallback: extract divisions from monthly summary data
        const uniqueDivisions = Array.from(
          new Map(
            monthlyItems
              .filter(req => req?.employee?.division)
              .map(req => [req.employee!.division!.id, req.employee!.division!])
          ).values()
        );
        setDivisions(uniqueDivisions as {id: number, name: string}[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monthly summary requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
      const endpoint = `/api/v2/overtime/monthly-summary/${selectedRequest.id}/${actionType}/`;
      const body = actionType === 'reject' ? { rejection_reason: rejectionReason } : {};

      const response = await authFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to ${actionType} monthly summary request`);
      }

      // Close modal and refresh data
      setIsModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');
      
      // Force refresh data to get updated status
      await fetchData();
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${actionType} monthly summary request`);
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (request: OvertimeSummaryRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setGlobalFilter('');
    setStatusFilter('');
    setDivisionFilter('');
    setPeriodFilter('');
    table.resetColumnFilters();
  };

  // Get unique periods and report types for filters
  const uniquePeriods = useMemo(() => {
    const safeData = Array.isArray(data) ? data : [];
    const periods = Array.from(new Set(safeData.map(item => item.request_period)));
    return periods.sort().reverse(); // Most recent first
  }, [data]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Rekap Bulanan Tim</CardTitle>
          <CardDescription>Loading monthly summary requests...</CardDescription>
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
          <CardTitle>Pengajuan Rekap Bulanan Tim</CardTitle>
          <CardDescription>Error loading monthly summary requests</CardDescription>
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
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Global Search */}
            <div>
              <Label htmlFor="global-search">Pencarian Global</Label>
              <Input
                id="global-search"
                placeholder="Cari karyawan, judul..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="level1_approved">Level 1 Approved</option>
                <option value="approved">Final Approved</option>
                <option value="rejected">Ditolak</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>
            
            {/* Division Filter */}
            <div>
              <Label htmlFor="division-filter">Divisi</Label>
              <select
                id="division-filter"
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Divisi</option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id.toString()}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Period Filter */}
            <div>
              <Label htmlFor="period-filter">Periode</Label>
              <select
                id="period-filter"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Periode</option>
                {uniquePeriods.map((period) => (
                  <option key={period} value={period}>
                    {formatPeriod(period)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="text-sm"
            >
              Clear Filters
            </Button>
            <div className="text-sm text-gray-500">
              Menampilkan {table.getFilteredRowModel().rows.length} dari {data.length} pengajuan
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Pengajuan Rekap Bulanan</CardTitle>
          <CardDescription>
            Kelola pengajuan rekap bulanan dari tim Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {table.getFilteredRowModel().rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">Tidak ada pengajuan rekap bulanan yang sesuai filter</p>
              <p className="text-sm">Coba ubah filter atau hapus filter untuk melihat semua data</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left py-3 px-2 font-medium"
                          >
                            {header.isPlaceholder ? null : (
                              <div
                                className={
                                  header.column.getCanSort()
                                    ? 'cursor-pointer select-none flex items-center space-x-1'
                                    : ''
                                }
                                onClick={header.column.getToggleSortingHandler()}
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
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-gray-50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3 px-2">
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

              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="text-sm text-gray-500">
                  Halaman {table.getState().pagination.pageIndex + 1} dari{' '}
                  {table.getPageCount()} ({table.getFilteredRowModel().rows.length} total)
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-[500px] max-w-[95vw] p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {actionType === 'approve' ? 'Setujui Pengajuan Rekap Bulanan' : 'Tolak Pengajuan Rekap Bulanan'}
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
                      <span className="font-medium">Periode:</span>
                      <div>{formatPeriod(selectedRequest.request_period)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Jenis Laporan:</span>
                      <div>{getReportTypeText(selectedRequest.report_type)}</div>
                    </div>
                    <div>
                      <span className="font-medium">Status Saat Ini:</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusText(selectedRequest.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium">Judul Laporan:</span>
                    <div className="mt-1 text-sm">{selectedRequest.request_title}</div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium">Deskripsi:</span>
                    <div className="mt-1 text-sm">{selectedRequest.request_description}</div>
                  </div>
                  <div className="mt-4">
                    <span className="font-medium">Data yang Diminta:</span>
                    <div className="mt-1 text-sm space-y-1">
                      <div>• Lembur: {selectedRequest.include_overtime ? '✓ Ya' : '✗ Tidak'}</div>
                      <div>• Absensi: {selectedRequest.include_attendance ? '✓ Ya' : '✗ Tidak'}</div>
                      <div>• Koreksi: {selectedRequest.include_corrections ? '✓ Ya' : '✗ Tidak'}</div>
                      <div>• Statistik: {selectedRequest.include_summary_stats ? '✓ Ya' : '✗ Tidak'}</div>
                    </div>
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
                      placeholder="Jelaskan alasan penolakan pengajuan rekap bulanan ini..."
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
