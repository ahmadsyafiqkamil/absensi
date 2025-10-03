"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Dialog from "@radix-ui/react-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Crown, Shield, Calendar } from "lucide-react";

export type EmployeeRow = {
  id: number;
  nip: string;
  fullname?: string | null;
  user: { id: number; username: string; email: string };
  division?: { id: number; name: string } | null;
  position?: { id: number; name: string; approval_level?: number } | null; // Legacy field
  gaji_pokok?: number | null;
  tmt_kerja?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  
  // Multi-position support
  employee_positions?: Array<{
    id: number;
    position: { id: number; name: string; approval_level: number };
    is_primary: boolean;
    is_active: boolean;
  }>;
  active_employee_positions?: Array<{
    id: number;
    position: { id: number; name: string; approval_level: number };
    is_primary: boolean;
    is_active: boolean;
  }>;
  primary_position?: { id: number; name: string } | null;
  approval_capabilities?: {
    approval_level: number;
    can_approve_overtime_org_wide: boolean;
    active_positions: Array<{ id: number; name: string; approval_level: number }>;
  };
};

const columns: ColumnDef<EmployeeRow>[] = [
  {
    header: "ID",
    accessorKey: "id",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<number>())}</span>,
  },
  {
    header: "NIP",
    accessorKey: "nip",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Full Name",
    accessorKey: "fullname",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>() ?? '-') }</span>,
  },
  {
    header: "Username",
    accessorFn: (row) => row.user?.username ?? "-",
    id: "username",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Email",
    accessorFn: (row) => row.user?.email ?? "-",
    id: "email",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Division",
    accessorFn: (row) => row.division?.name ?? "-",
    id: "division",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Primary Position",
    accessorFn: (row) => row.primary_position?.name ?? row.position?.name ?? "-",
    id: "primary_position",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Total Positions",
    accessorFn: (row) => row.active_employee_positions?.length ?? row.employee_positions?.length ?? (row.position ? 1 : 0),
    id: "total_positions",
    cell: ({ getValue }) => {
      const count = getValue<number>();
      return (
        <span className={`text-sm px-2 py-1 rounded-full ${
          count > 1 ? 'bg-blue-100 text-blue-800' : 
          count === 1 ? 'bg-gray-100 text-gray-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {count}
        </span>
      );
    },
  },
  {
    header: "Approval Level",
    accessorFn: (row) => row.approval_capabilities?.approval_level ?? row.position?.approval_level ?? 0,
    id: "approval_level",
    cell: ({ getValue }) => {
      const level = getValue<number>();
      const colorClass = level >= 2 ? 'text-green-600 bg-green-50' : 
                        level >= 1 ? 'text-blue-600 bg-blue-50' : 
                        'text-red-600 bg-red-50';
      return (
        <span className={`text-sm px-2 py-1 rounded-full ${colorClass}`}>
          Level {level}
        </span>
      );
    },
  },
  {
    header: "Gaji Pokok",
    accessorFn: (row) => row.gaji_pokok ?? "-",
    id: "gaji_pokok",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "TMT Kerja",
    accessorFn: (row) => row.tmt_kerja ?? "-",
    id: "tmt_kerja",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  { 
    header: "Tempat Lahir",
    accessorFn: (row) => row.tempat_lahir ?? "-",
    id: "tempat_lahir",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Tanggal Lahir",
    accessorFn: (row) => row.tanggal_lahir ?? "-",
    id: "tanggal_lahir",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Actions",
    id: "actions",
    cell: ({ row, table }) => {
      const id = row.original.id
      return (
        <div className="flex gap-1">
          <Button data-id={id} variant="outline" size="sm" className="px-2 py-1 h-auto text-xs"
            onClick={() => (table.options.meta as any)?.onOpenEdit?.(id)}
          >
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="px-2 py-1 h-auto text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
            onClick={() => window.open(`/admin/employees/${id}/positions`, '_blank')}
          >
            Positions
          </Button>
          <Button data-id={id} variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 px-2 py-1 h-auto text-xs"
            onClick={() => (table.options.meta as any)?.onDelete?.(id)}
          >
            Delete
          </Button>
        </div>
      )
    },
    enableSorting: false,
  },
];

export default function EmployeesTable({ data }: { data: EmployeeRow[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this employee?')) return;
    const resp = await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' })
    if (resp.ok || resp.status === 204) {
      router.refresh()
    } else {
      const data = await resp.json().catch(() => ({} as any))
      alert(data?.detail || 'Failed to delete')
    }
  }, [router])
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [formData, setFormData] = useState({
    nip: '',
    fullname: '',
    division_id: '',
    position_id: '',
    gaji_pokok: '',
    tmt_kerja: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    role: '',
  })
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([])
  const [positions, setPositions] = useState<{ id: number; name: string; approval_level: number; can_approve_overtime_org_wide: boolean }[]>([])
  
  // Multi-position states
  const [employeePositions, setEmployeePositions] = useState<Array<{
    id: number;
    position: { id: number; name: string; approval_level: number };
    is_primary: boolean;
    is_active: boolean;
    effective_from: string;
    effective_until: string | null;
    assignment_notes: string;
  }>>([])
  const [showMultiPosition, setShowMultiPosition] = useState(false)
  const [newPositionAssignments, setNewPositionAssignments] = useState<Array<{
    position_id: number;
    position: { id: number; name: string; approval_level: number };
    is_primary: boolean;
    is_active: boolean;
    effective_from: string;
    effective_until: string;
    assignment_notes: string;
  }>>([])
  const [positionsToDeactivate, setPositionsToDeactivate] = useState<number[]>([])

  const handleOpenEdit = useCallback(async (id: number) => {
    setEditingId(id)
    setErrorMsg("")
    // Reset multi-position states
    setEmployeePositions([])
    setNewPositionAssignments([])
    setPositionsToDeactivate([])
    setShowMultiPosition(false)
    
    // load lookups
    const [d, p] = await Promise.all([
      fetch('/api/admin/divisions').then(r => r.json()).catch(() => ({})),
      fetch('/api/admin/positions').then(r => r.json()).catch(() => ({})),
    ])
    setDivisions(Array.isArray(d) ? d : (d?.results ?? []))
    setPositions(Array.isArray(p) ? p : (p?.results ?? []))
    
    // load employee
    const resp = await fetch(`/api/admin/employees/${id}`)
    const data = await resp.json().catch(() => ({} as any))
    if (!resp.ok) {
      alert(data?.detail || 'Failed to load employee')
      return
    }
    
    // Load employee positions (use active_employee_positions for UI, but keep employee_positions for reference)
    const empPositions = data.active_employee_positions || data.employee_positions || []
    setEmployeePositions(empPositions)
    setShowMultiPosition(empPositions.length > 0)
    
    setFormData({
      nip: data.nip || '',
      fullname: data.fullname || '',
      division_id: data.division?.id?.toString?.() ?? '',
      position_id: data.primary_position?.id?.toString?.() ?? data.position?.id?.toString?.() ?? '',
      gaji_pokok: data.gaji_pokok?.toString?.() ?? '',
      tmt_kerja: data.tmt_kerja || '',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
      role: data.user?.groups?.[0] || '',
    })
    setEditOpen(true)
  }, [])
  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Multi-position management functions
  const addNewPositionAssignment = () => {
    const today = new Date().toISOString().split('T')[0];
    const newAssignment = {
      position_id: 0,
      position: { id: 0, name: '', approval_level: 0 },
      is_primary: employeePositions.length === 0 && newPositionAssignments.length === 0,
      is_active: true,
      effective_from: today,
      effective_until: '',
      assignment_notes: ''
    };
    setNewPositionAssignments([...newPositionAssignments, newAssignment]);
  };

  const removeNewPositionAssignment = (index: number) => {
    const updatedAssignments = newPositionAssignments.filter((_, i) => i !== index);
    // If we removed the primary position, make the first remaining position primary
    if (newPositionAssignments[index].is_primary && updatedAssignments.length > 0) {
      updatedAssignments[0].is_primary = true;
    }
    setNewPositionAssignments(updatedAssignments);
  };

  const updateNewPositionAssignment = (index: number, field: string, value: any) => {
    const updatedAssignments = [...newPositionAssignments];
    
    if (field === 'position_id') {
      const selectedPosition = positions.find(p => p.id === parseInt(value));
      if (selectedPosition) {
        updatedAssignments[index].position_id = selectedPosition.id;
        updatedAssignments[index].position = {
          id: selectedPosition.id,
          name: selectedPosition.name,
          approval_level: selectedPosition.approval_level
        };
      }
    } else if (field === 'is_primary' && value) {
      // Only one position can be primary - reset all others
      updatedAssignments.forEach((pos, i) => {
        pos.is_primary = i === index;
      });
      // Also reset existing positions primary status
      const updatedExisting = employeePositions.map(pos => ({
        ...pos,
        is_primary: false
      }));
      setEmployeePositions(updatedExisting);
    } else {
      (updatedAssignments[index] as any)[field] = value;
    }
    
    setNewPositionAssignments(updatedAssignments);
  };

  const togglePositionDeactivation = (positionId: number) => {
    if (positionsToDeactivate.includes(positionId)) {
      setPositionsToDeactivate(positionsToDeactivate.filter(id => id !== positionId));
    } else {
      setPositionsToDeactivate([...positionsToDeactivate, positionId]);
    }
  };

  const setPrimaryPosition = (positionId: number, isExisting: boolean) => {
    if (isExisting) {
      // Set primary for existing position
      const updatedExisting = employeePositions.map(pos => ({
        ...pos,
        is_primary: pos.position.id === positionId
      }));
      setEmployeePositions(updatedExisting);
      // Reset new assignments primary status
      const updatedNew = newPositionAssignments.map(pos => ({
        ...pos,
        is_primary: false
      }));
      setNewPositionAssignments(updatedNew);
    }
  };

  const getApprovalLevelBadge = (level: number) => {
    const variant = level >= 2 ? 'default' : level >= 1 ? 'secondary' : 'destructive';
    return (
      <Badge variant={variant} className="text-xs">
        Level {level}
      </Badge>
    );
  };

  const getUsedPositionIds = () => {
    const existingIds = employeePositions.map(p => p.position.id);
    const newIds = newPositionAssignments.map(p => p.position_id).filter(id => id > 0);
    return [...existingIds, ...newIds];
  };
  const handleSave = useCallback(async () => {
    if (!editingId) return
    setSaving(true)
    setErrorMsg("")
    try {
      // Update basic employee info
      const payload: any = {
        nip: formData.nip,
        fullname: formData.fullname || null,
        division_id: formData.division_id || null,
        position_id: formData.position_id || null,
        gaji_pokok: formData.gaji_pokok ? formData.gaji_pokok : null,
        tmt_kerja: formData.tmt_kerja || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        groups: formData.role ? [formData.role] : [],
      }
      const resp = await fetch(`/api/admin/employees/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({} as any))
      if (!resp.ok) throw new Error(data?.detail || 'Failed to update employee')

      // Handle position assignments if multi-position is enabled
      if (showMultiPosition) {
        // Deactivate positions marked for deactivation
        for (const positionAssignmentId of positionsToDeactivate) {
          try {
            await fetch(`/api/employees/employee-positions/${positionAssignmentId}/deactivate/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            console.warn(`Failed to deactivate position assignment ${positionAssignmentId}:`, error);
          }
        }

        // Add new position assignments
        for (const assignment of newPositionAssignments) {
          if (assignment.position_id > 0) {
            try {
              await fetch('/api/employees/employee-positions/assign_position/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employee_id: editingId,
                  position_id: assignment.position_id,
                  is_primary: assignment.is_primary,
                  is_active: assignment.is_active,
                  effective_from: assignment.effective_from,
                  effective_until: assignment.effective_until || null,
                  assignment_notes: assignment.assignment_notes || `Added via edit modal - ${new Date().toISOString()}`
                })
              });
            } catch (error) {
              console.warn(`Failed to assign position ${assignment.position.name}:`, error);
            }
          }
        }

        // Update primary status for existing positions
        const primaryPosition = employeePositions.find(p => p.is_primary);
        if (primaryPosition) {
          try {
            await fetch(`/api/employees/employee-positions/set_primary/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee_id: editingId,
                position_id: primaryPosition.position.id
              })
            });
          } catch (error) {
            console.warn('Failed to update primary position:', error);
          }
        }
      }

      setEditOpen(false)
      router.refresh()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [editingId, formData, showMultiPosition, employeePositions, newPositionAssignments, positionsToDeactivate, router])
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: { onDelete: handleDelete, onOpenEdit: handleOpenEdit },
  });

  return (
    <div className="overflow-x-auto bg-white border rounded-md">
      <div className="p-3 grid gap-2 md:grid-cols-5 grid-cols-1 border-b bg-gray-50">
        <Input
          placeholder="Filter NIP"
          value={(table.getColumn('nip')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('nip')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Username"
          value={(table.getColumn('username')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('username')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Email"
          value={(table.getColumn('email')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('email')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Division"
          value={(table.getColumn('division')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('division')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Primary Position"
          value={(table.getColumn('primary_position')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('primary_position')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Gaji Pokok"
          value={(table.getColumn('gaji_pokok')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('gaji_pokok')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter TMT Kerja"
          value={(table.getColumn('tmt_kerja')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('tmt_kerja')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Tempat Lahir"
          value={(table.getColumn('tempat_lahir')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('tempat_lahir')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Tanggal Lahir"
          value={(table.getColumn('tanggal_lahir')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('tanggal_lahir')?.setFilterValue(e.target.value)}
        />
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider select-none"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && <span>▲</span>}
                    {header.column.getIsSorted() === "desc" && <span>▼</span>}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                No employees found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col">
            {/* Header - Sticky */}
            <div className="flex-shrink-0 p-4 border-b">
              <Dialog.Title className="text-lg font-semibold">Edit Employee</Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500">Update employee details</Dialog.Description>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
              <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fullname">Full Name</Label>
                <Input id="fullname" name="fullname" value={formData.fullname} onChange={onChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" name="nip" value={formData.nip} onChange={onChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Role</Label>
                <select id="role" name="role" value={formData.role} onChange={onChange} className="w-full h-10 border rounded px-2 text-sm">
                  <option value="">Select Role</option>
                  <option value="pegawai">Pegawai</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="division_id">Division</Label>
                  <select id="division_id" name="division_id" value={formData.division_id} onChange={onChange} className="w-full h-10 border rounded px-2 text-sm">
                    <option value="">Select Division</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="position_id">Position</Label>
                  <select id="position_id" name="position_id" value={formData.position_id} onChange={onChange} className="w-full h-10 border rounded px-2 text-sm">
                    <option value="">Select Position</option>
                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="gaji_pokok">Gaji Pokok</Label>
                  <Input id="gaji_pokok" name="gaji_pokok" type="number" step="0.01" value={formData.gaji_pokok} onChange={onChange} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tmt_kerja">TMT Kerja</Label>
                  <Input id="tmt_kerja" name="tmt_kerja" type="date" value={formData.tmt_kerja} onChange={onChange} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                  <Input id="tempat_lahir" name="tempat_lahir" value={formData.tempat_lahir} onChange={onChange} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                  <Input id="tanggal_lahir" name="tanggal_lahir" type="date" value={formData.tanggal_lahir} onChange={onChange} />
                </div>
              </div>

              {/* Multi-Position Management Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Position Management
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={showMultiPosition}
                      onCheckedChange={(checked) => {
                        setShowMultiPosition(!!checked);
                        if (!checked) {
                          setNewPositionAssignments([]);
                          setPositionsToDeactivate([]);
                        }
                      }}
                    />
                    <Label className="text-xs font-normal">Enable Multi-Position</Label>
                  </div>
                </div>

                {showMultiPosition ? (
                  <div className="space-y-4 p-3 border rounded bg-gray-50">
                    {/* Existing Positions */}
                    {employeePositions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-gray-700">Current Positions</h4>
                        {employeePositions.map((position) => (
                          <div key={position.id} className={`p-2 border rounded bg-white ${positionsToDeactivate.includes(position.id) ? 'opacity-50 bg-red-50' : ''}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{position.position.name}</span>
                                {position.is_primary && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Crown className="h-3 w-3" />
                                    Primary
                                  </Badge>
                                )}
                                {getApprovalLevelBadge(position.position.approval_level)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPrimaryPosition(position.position.id, true)}
                                  disabled={position.is_primary || positionsToDeactivate.includes(position.id)}
                                  className="text-xs px-2 py-1 h-auto"
                                >
                                  Set Primary
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePositionDeactivation(position.id)}
                                  className={`text-xs px-2 py-1 h-auto ${positionsToDeactivate.includes(position.id) ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {positionsToDeactivate.includes(position.id) ? 'Restore' : 'Remove'}
                                </Button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              From: {position.effective_from} {position.effective_until && `• Until: ${position.effective_until}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New Position Assignments */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium text-gray-700">Add New Positions</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addNewPositionAssignment}
                          className="text-xs px-2 py-1 h-auto flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add Position
                        </Button>
                      </div>

                      {newPositionAssignments.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          Click "Add Position" to assign additional positions
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {newPositionAssignments.map((assignment, index) => (
                            <div key={index} className="p-2 border rounded bg-white space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">New Position {index + 1}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeNewPositionAssignment(index)}
                                  className="text-red-600 hover:text-red-700 text-xs px-1 py-0 h-auto"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <select 
                                    value={assignment.position_id} 
                                    onChange={(e) => updateNewPositionAssignment(index, 'position_id', e.target.value)}
                                    className="w-full text-xs border rounded px-1 py-1"
                                  >
                                    <option value={0}>Select Position</option>
                                    {positions
                                      .filter(pos => 
                                        pos.id === assignment.position_id || 
                                        !getUsedPositionIds().includes(pos.id)
                                      )
                                      .map((position) => (
                                        <option key={position.id} value={position.id}>
                                          {position.name} (Level {position.approval_level})
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>
                                <div>
                                  <Input
                                    type="date"
                                    value={assignment.effective_from}
                                    onChange={(e) => updateNewPositionAssignment(index, 'effective_from', e.target.value)}
                                    className="text-xs h-6"
                                    placeholder="Effective From"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={assignment.is_primary}
                                    onCheckedChange={(checked) => updateNewPositionAssignment(index, 'is_primary', !!checked)}
                                  />
                                  <Label className="text-xs">Primary Position</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Checkbox 
                                    checked={assignment.is_active}
                                    onCheckedChange={(checked) => updateNewPositionAssignment(index, 'is_active', !!checked)}
                                  />
                                  <Label className="text-xs">Active</Label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-2">
                    Enable multi-position to manage multiple positions for this employee
                  </p>
                )}
              </div>

              {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{errorMsg}</div>}
              </div>
            </div>
            
            {/* Footer - Sticky */}
            <div className="flex-shrink-0 p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}


