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

type OvertimeRequest = {
  id: number;
  employee: Employee;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  date: string;
  total_hours: string;
  work_description: string;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected';
  approved_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  approved_at: string | null;
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
  level1_rejected_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  level1_rejected_at: string | null;
  final_rejected_by: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  } | null;
  final_rejected_at: string | null;
  rejection_reason: string | null;
  total_amount: string | number | null;
  hourly_rate: string | number | null;
  created_at: string;
  updated_at: string;
  requested_at: string;
};

type OvertimeRequestsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: OvertimeRequest[];
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'text-green-600 bg-green-100';
    case 'level1_approved':
      return 'text-blue-600 bg-blue-100';
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
      return 'Final Approved';
    case 'level1_approved':
      return 'Level 1 Approved';
    case 'rejected':
      return 'Ditolak';
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

const columnHelper = createColumnHelper<OvertimeRequest>();

interface OvertimeRequestsTableProps {
  onRefresh?: () => void;
}

export default function OvertimeRequestsTable({ onRefresh }: OvertimeRequestsTableProps) {
  const [data, setData] = useState<OvertimeRequest[]>([]);
  const [divisions, setDivisions] = useState<{id: number, name: string}[]>([]);
  const [supervisorInfo, setSupervisorInfo] = useState<{isOrgWide: boolean, isAdmin: boolean, approvalLevel: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
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
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  const columns = useMemo(
    () => [
      columnHelper.accessor('employee', {
        id: 'employee',
        header: 'Karyawan',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{getEmployeeName(row.original.employee)}</div>
            <div className="text-xs text-gray-500">
              {(row.original.employee?.division?.name) || 'No Division'} • {row.original.employee?.nip || '-'}
            </div>
          </div>
        ),
        filterFn: 'includesString',
      }),
      columnHelper.accessor('date', {
        header: 'Tanggal',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{formatDate(row.original.date)}</div>
            <div className="text-xs text-gray-500">
              Diajukan: {formatDateTime(row.original.requested_at || row.original.created_at)}
            </div>
          </div>
        ),
        sortingFn: 'datetime',
      }),
      columnHelper.accessor('total_hours', {
        header: 'Jam Lembur',
        cell: ({ getValue }) => (
          <div className="font-medium text-blue-600">
            {parseFloat(getValue() as string).toFixed(1)}j
          </div>
        ),
        sortingFn: 'alphanumeric',
      }),
      columnHelper.accessor('work_description', {
        header: 'Deskripsi Pekerjaan',
        cell: ({ getValue }) => (
          <div className="text-sm max-w-xs line-clamp-2" title={getValue()}>
            {getValue()}
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
            
            {row.original.status === 'rejected' && (
              <div className="text-xs space-y-1">
                {row.original.level1_rejected_by && (
                  <div className="text-red-600">
                    ✗ Level 1: {row.original.level1_rejected_by.username}
                    {row.original.level1_rejected_at && (
                      <span className="text-gray-500 ml-1">
                        ({formatDateTime(row.original.level1_rejected_at)})
                      </span>
                    )}
                  </div>
                )}
                {row.original.final_rejected_by && (
                  <div className="text-red-600">
                    ✗ Final: {row.original.final_rejected_by.username}
                    {row.original.final_rejected_at && (
                      <span className="text-gray-500 ml-1">
                        ({formatDateTime(row.original.final_rejected_at)})
                      </span>
                    )}
                  </div>
                )}
                {row.original.rejection_reason && (
                  <div className="text-red-600" title={row.original.rejection_reason}>
                    Alasan: {row.original.rejection_reason.length > 30 
                      ? row.original.rejection_reason.substring(0, 30) + '...' 
                      : row.original.rejection_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        ),
        filterFn: (row, id, value) => {
          return value === '' || row.getValue(id) === value;
        },
      }),
      columnHelper.accessor('total_amount', {
        header: 'Gaji Lembur',
        cell: ({ getValue }) => {
          const amount = getValue() as string | number | null;
          if (amount === null || amount === undefined || amount === '') {
            return (
              <div className="font-medium text-gray-500">
                Belum dihitung
              </div>
            );
          }
          return (
            <div className="font-medium text-green-600">
              {formatCurrency(amount)}
            </div>
          );
        },
        sortingFn: 'alphanumeric',
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
          
          // Get the actual approval level from current context
          const actualApprovalLevel = supervisorInfo?.approvalLevel || 1;
          
          if (isAdmin) {
            // Admin can approve any status except rejected/approved
            canApprove = status === 'pending' || status === 'level1_approved';
            canReject = status === 'pending' || status === 'level1_approved';
            buttonText = status === 'level1_approved' ? 'Final Approve' : 'Setujui';
          } else if (actualApprovalLevel >= 2 && isOrgWide) {
            // User has approval level 2+ AND org-wide permission: can do final approval
            canApprove = status === 'level1_approved';
            canReject = status === 'pending' || status === 'level1_approved';
            buttonText = 'Final Approve';
            if (status === 'pending') {
              disabledReason = 'Menunggu Level 1 Approval';
              canApprove = false;
            }
          } else if (actualApprovalLevel >= 1) {
            // User has approval level 1+: can do level 1 approval for pending requests
            canApprove = status === 'pending';
            canReject = status === 'pending';
            buttonText = 'Level 1 Approve';
            
            // If user has org-wide permission but only level 1 approval, they can still do level 1
            if (isOrgWide && actualApprovalLevel === 1) {
              // This handles cases like konsuler becoming home staff (level 1) but having org-wide permission
              buttonText = 'Level 1 Approve';
            }
          } else {
            // No approval permission
            canApprove = false;
            canReject = false;
            disabledReason = 'Tidak memiliki permission approval';
          }
          

          
          if (status === 'approved' || status === 'rejected') {
            return (
              <span className="text-xs text-gray-500">
                {status === 'approved' ? 'Sudah disetujui' : 'Sudah ditolak'}
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
                    title={supervisorInfo?.isAdmin ? 'Reject (Final)' : 
                           (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Reject (Final)' : 
                           'Reject (Level 1)'}
                  >
                    {supervisorInfo?.isAdmin || (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Final Reject' : 'Level 1 Reject'}
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
    
    // Date range filter
      if (dateFromFilter) {
        filtered = filtered.filter(item => 
          new Date(item.date) >= new Date(dateFromFilter)
        );
      }
      
      if (dateToFilter) {
        filtered = filtered.filter(item => 
          new Date(item.date) <= new Date(dateToFilter)
        );
      }
    
    return filtered;
  }, [data, statusFilter, divisionFilter, dateFromFilter, dateToFilter]);

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
    console.log('🎯 OvertimeRequestsTable: Component mounted, starting fetchData...');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 OvertimeRequestsTable: Starting to fetch data...');
      
      // Fetch data individually to avoid Promise.all issues
      const overtimeResponse = await authFetch('/api/v2/overtime/overtime/');

      const divisionsResponse = await authFetch('/api/v2/employees/divisions/');
      const supervisorResponse = await authFetch('/api/v2/auth/me');

      if (!overtimeResponse.ok) {
        throw new Error('Failed to fetch overtime requests');
      }

      const overtimeData = await overtimeResponse.json();
      console.log('📊 OvertimeRequestsTable: Overtime data received:', overtimeData);
      
      // Handle both array response and paginated response
      const results = Array.isArray(overtimeData) ? overtimeData : overtimeData.results || [];
      console.log('📊 OvertimeRequestsTable: Results to display:', results);
      setData(results);


      // Fetch supervisor info (optional, for determining role)
      if (supervisorResponse.ok) {
        const meData = await supervisorResponse.json();
        const supervisorInfo = {
          isOrgWide: meData?.current_context?.can_approve_overtime_org_wide || false,
          isAdmin: (meData?.groups || []).includes('admin') || !!meData?.is_superuser,
          approvalLevel: meData?.current_context?.approval_level || 1
        };
        console.log('🔍 Supervisor Info Debug:', {
          current_context: meData?.current_context,
          supervisorInfo,
          raw_meData: meData
        });
        setSupervisorInfo(supervisorInfo);
      } else {
        // Fallback: assume division supervisor
        setSupervisorInfo({
          isOrgWide: false,
          isAdmin: false,
          approvalLevel: 1
        });
      }

      // Fetch divisions (optional, don't fail if it doesn't work)
      if (divisionsResponse.ok) {
        const divisionsData = await divisionsResponse.json();
        // Extract unique divisions from the overtime data and merge with API data
        const uniqueDivisions = Array.from(
          new Map([
            ...results
              .filter((req: OvertimeRequest) => req?.employee?.division)
              .map((req: OvertimeRequest) => [req.employee!.division!.id, req.employee!.division!]),
            ...(divisionsData.results || divisionsData || []).map((div: any) => [div.id, div])
          ].filter(([_, division]) => division)).values()
        );
        setDivisions(uniqueDivisions as {id: number, name: string}[]);
      } else {
        // Fallback: extract divisions from overtime data
        const uniqueDivisions = Array.from(
          new Map(
            results
              .filter((req: OvertimeRequest) => req?.employee?.division)
              .map((req: OvertimeRequest) => [req.employee!.division!.id, req.employee!.division!])
          ).values()
        );
        setDivisions(uniqueDivisions as {id: number, name: string}[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overtime requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessing(true);
    try {
        const endpoint = `/api/v2/overtime/overtime/${selectedRequest.id}/${actionType}/`;
      const body = actionType === 'reject' ? { rejection_reason: rejectionReason } : actionType === 'approve' ? { approval_level: supervisorInfo?.approvalLevel || 1 } : {};

      const response = await authFetch(endpoint, {
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
      
      // Force refresh data to get updated status
      await fetchData();
      onRefresh?.();
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

  const clearFilters = () => {
    setGlobalFilter('');
    setStatusFilter('');
    setDivisionFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setColumnFilters([]);
    table.resetColumnFilters();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pengajuan Lembur Tim</CardTitle>
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
          <CardTitle>Pengajuan Lembur Tim</CardTitle>
          <CardDescription>Error loading overtime requests</CardDescription>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Global Search */}
            <div>
              <Label htmlFor="global-search">Pencarian Global</Label>
              <Input
                id="global-search"
                placeholder="Cari karyawan, deskripsi..."
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
                {divisions.map((division, index) => (
                  <option key={`division-${division.id || index}`} value={division.id.toString()}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date From */}
            <div>
              <Label htmlFor="date-from">Tanggal Dari</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>
            
            {/* Date To */}
            <div>
              <Label htmlFor="date-to">Tanggal Sampai</Label>
              <Input
                id="date-to"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
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
          <CardTitle>Daftar Pengajuan Lembur</CardTitle>
          <CardDescription>
            Kelola pengajuan lembur dari tim Anda
            {supervisorInfo && (
              <div className="mt-2 text-sm">
                <span className="font-medium">Role Anda: </span>
                {supervisorInfo.isAdmin ? (
                  <span className="text-purple-600">Admin (Dapat approve/reject semua level)</span>
                ) : supervisorInfo.isOrgWide && supervisorInfo.approvalLevel >= 2 ? (
                  <span className="text-blue-600">Supervisor Organization-wide (Final approval)</span>
                ) : supervisorInfo.approvalLevel >= 1 ? (
                  <span className="text-green-600">
                    Supervisor Level {supervisorInfo.approvalLevel} 
                    {supervisorInfo.isOrgWide ? ' (Org-wide permission)' : ' (Divisi)'}
                  </span>
                ) : (
                  <span className="text-gray-600">Tidak memiliki permission approval</span>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {table.getFilteredRowModel().rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">Tidak ada pengajuan lembur yang sesuai filter</p>
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
              {actionType === 'approve' ? 'Setujui Pengajuan Lembur' : 'Tolak Pengajuan Lembur'}
            </Dialog.Title>
            
            {/* Action Type Indicator */}
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-sm font-medium text-blue-800">
                {actionType === 'approve' ? (
                  <>
                    {supervisorInfo?.isAdmin ? 'Admin Approval' : 
                     (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Final Approval' : 
                     'Level 1 Approval'}
                  </>
                ) : (
                  <>
                    {supervisorInfo?.isAdmin ? 'Admin Rejection' : 
                     (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Final Rejection' : 
                     'Level 1 Rejection'}
                  </>
                )}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {actionType === 'approve' ? (
                  <>
                    {supervisorInfo?.isAdmin ? 'Anda akan melakukan final approval langsung' : 
                     (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Anda akan melakukan final approval setelah level 1' : 
                     'Anda akan melakukan level 1 approval, menunggu final approval'}
                  </>
                ) : (
                  <>
                    {supervisorInfo?.isAdmin ? 'Anda akan melakukan final rejection langsung' : 
                     (supervisorInfo?.isOrgWide && supervisorInfo?.approvalLevel >= 2) ? 'Anda akan melakukan final rejection' : 
                     'Anda akan melakukan level 1 rejection'}
                  </>
                )}
              </div>
            </div>
            
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
                       <div>{formatDate(selectedRequest.date)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Jam Lembur:</span>
                       <div>{parseFloat(selectedRequest.total_hours).toFixed(1)} jam</div>
                      </div>
                      <div>
                        <span className="font-medium">Gaji Lembur:</span>
                       <div>
                         {selectedRequest.total_amount ? 
                           formatCurrency(selectedRequest.total_amount) : 
                           'Belum dihitung'
                         }
                       </div>
                      </div>
                    <div className="col-span-2">
                      <span className="font-medium">Status Saat Ini:</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusText(selectedRequest.status)}
                        </span>
                      </div>
                      
                      {/* Approval/Rejection History */}
                      {(selectedRequest.level1_approved_by || selectedRequest.final_approved_by || 
                        selectedRequest.level1_rejected_by || selectedRequest.final_rejected_by) && (
                        <div className="mt-2 text-xs space-y-1">
                          {selectedRequest.level1_approved_by && (
                            <div className="text-green-600">
                              ✓ Level 1 Approved by: {selectedRequest.level1_approved_by.username}
                              {selectedRequest.level1_approved_at && (
                                <span className="text-gray-500 ml-1">
                                  ({formatDateTime(selectedRequest.level1_approved_at)})
                                </span>
                              )}
                            </div>
                          )}
                          {selectedRequest.final_approved_by && (
                            <div className="text-green-600">
                              ✓ Final Approved by: {selectedRequest.final_approved_by.username}
                              {selectedRequest.final_approved_at && (
                                <span className="text-gray-500 ml-1">
                                  ({formatDateTime(selectedRequest.final_approved_at)})
                                </span>
                              )}
                            </div>
                          )}
                          {selectedRequest.level1_rejected_by && (
                            <div className="text-red-600">
                              ✗ Level 1 Rejected by: {selectedRequest.level1_rejected_by.username}
                              {selectedRequest.level1_rejected_at && (
                                <span className="text-gray-500 ml-1">
                                  ({formatDateTime(selectedRequest.level1_rejected_at)})
                                </span>
                              )}
                            </div>
                          )}
                          {selectedRequest.final_rejected_by && (
                            <div className="text-red-600">
                              ✗ Final Rejected by: {selectedRequest.final_rejected_by.username}
                              {selectedRequest.final_rejected_at && (
                                <span className="text-gray-500 ml-1">
                                  ({formatDateTime(selectedRequest.final_rejected_at)})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
