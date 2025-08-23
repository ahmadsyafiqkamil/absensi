"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as Dialog from '@radix-ui/react-dialog';
import { authFetch } from '@/lib/authFetch';
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

type Employee = {
  id: number;
  user: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  nip: string;
  division?: {
    id: number;
    name: string;
  };
  position?: {
    id: number;
    name: string;
  };
  fullname?: string;
};

type OvertimeRequest = {
  id: number;
  employee: Employee;
  date_requested: string;
  overtime_hours: string;
  work_description: string;
  status: 'pending' | 'level1_approved' | 'approved' | 'rejected';
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

const columnHelper = createColumnHelper<OvertimeRequest>();

export default function AdminOvertimeRequestsClient() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'level1_approved' | 'approved' | 'rejected'>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

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
        authFetch(`/api/overtime-requests/?${queryParams.toString()}`),
        authFetch('/api/overtime-requests/summary/')
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

  const handleAction = async (request: OvertimeRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setRejectionReason('');
    setIsModalOpen(true);
  };

  const processAction = async () => {
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
        throw new Error(errorData.detail || `Failed to ${actionType} request`);
      }

      setIsModalOpen(false);
      await fetchData(); // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${actionType} request`);
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    columnHelper.accessor('employee', {
      header: 'Employee',
      cell: (info) => {
        const employee = info.getValue();
        return (
          <div>
            <div className="font-medium">{getEmployeeName(employee)}</div>
            <div className="text-xs text-gray-500">
              {employee.nip} • {employee.division?.name || 'No Division'}
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('date_requested', {
      header: 'Tanggal',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('overtime_hours', {
      header: 'Jam Lembur',
      cell: (info) => `${info.getValue()}j`,
    }),
    columnHelper.accessor('work_description', {
      header: 'Deskripsi Pekerjaan',
      cell: (info) => (
        <div className="max-w-xs truncate" title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('overtime_amount', {
      header: 'Jumlah Gaji',
      cell: (info) => formatCurrency(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const request = info.row.original;
        const status = info.getValue();
        return (
          <div className="flex flex-col space-y-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
            {request.level1_approved_by && (
              <div className="text-xs text-gray-500">
                L1: {request.level1_approved_by.username}
              </div>
            )}
            {request.final_approved_by && (
              <div className="text-xs text-gray-500">
                Final: {request.final_approved_by.username}
              </div>
            )}
            {status === 'rejected' && request.rejection_reason && (
              <div className="text-xs text-red-600" title={request.rejection_reason}>
                Alasan: {request.rejection_reason.length > 30 
                  ? request.rejection_reason.substring(0, 30) + '...' 
                  : request.rejection_reason}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Tanggal Pengajuan',
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const request = info.row.original;
        const canApprove = request.status !== 'approved' && request.status !== 'rejected';
        
        return canApprove ? (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700"
              onClick={() => handleAction(request, 'approve')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => handleAction(request, 'reject')}
            >
              Reject
            </Button>
          </div>
        ) : null;
      },
    }),
  ];

  const table = useReactTable({
    data: requests,
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
          <CardTitle>Overtime Requests</CardTitle>
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
          <CardTitle>Overtime Requests</CardTitle>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.total_requests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summary.pending_requests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Level 1 Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.level1_approved_requests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Final Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.approved_requests}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(summary.total_approved_amount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter">Filter by Status:</Label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="level1_approved">Level 1 Approved</option>
            <option value="approved">Final Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Overtime Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Overtime Requests</CardTitle>
          <CardDescription>
            {requests.length > 0 
              ? `Showing ${requests.length} overtime requests` 
              : 'No overtime requests found'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2">No overtime requests found</p>
            </div>
          ) : (
            <>
              {/* Global Search */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search requests..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="max-w-sm"
                />
                <div className="text-sm text-gray-500">
                  Showing {table.getFilteredRowModel().rows.length} of {requests.length} records
                </div>
              </div>

              {/* TanStack Table */}
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
                      Page {table.getState().pagination.pageIndex + 1} of{' '}
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
                          {pageSize} per page
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Modal */}
      <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-semibold mb-4">
              {actionType === 'approve' ? 'Approve Overtime Request' : 'Reject Overtime Request'}
            </Dialog.Title>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p><strong>Employee:</strong> {getEmployeeName(selectedRequest.employee)}</p>
                  <p><strong>Date:</strong> {formatDate(selectedRequest.date_requested)}</p>
                  <p><strong>Hours:</strong> {selectedRequest.overtime_hours}j</p>
                  <p><strong>Amount:</strong> {formatCurrency(selectedRequest.overtime_amount)}</p>
                  <p><strong>Current Status:</strong> {getStatusText(selectedRequest.status)}</p>
                </div>

                {actionType === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                    <textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejection..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      required
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Dialog.Close asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button 
                    onClick={processAction}
                    className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                    disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                  >
                    {processing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
