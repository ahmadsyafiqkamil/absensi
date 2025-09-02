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
import RoleManagement from "@/components/RoleManagement";

export type EmployeeRow = {
  id: number;
  nip: string;
  fullname?: string | null;
  user: { id: number; username: string; email: string };
  division?: { id: number; name: string } | null;
  position?: {
    id: number;
    name: string;
    can_approve_overtime_org_wide: boolean;
    approval_level: number;
  } | null;
  gaji_pokok?: number | null;
  tmt_kerja?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  // Multi-role information
  roles?: {
    active_roles: string[];
    primary_role: string | null;
    role_names: string[];
    has_multiple_roles: boolean;
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
    header: "Position",
    accessorFn: (row) => row.position?.name ?? "-",
    id: "position",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
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
    header: "Roles",
    accessorFn: (row) => row.roles?.role_names?.join(', ') ?? "-",
    id: "roles",
    cell: ({ row }) => {
      const roles = row.original.roles;
      if (!roles) return <span className="text-gray-500 text-sm">-</span>;

      return (
        <div className="flex flex-col gap-1">
          {roles.primary_role && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              🎯 {roles.primary_role}
            </span>
          )}
          {roles.role_names.filter(role => role !== roles.primary_role).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roles.role_names.filter(role => role !== roles.primary_role).map(role => (
                <span key={role} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {role}
                </span>
              ))}
            </div>
          )}
          {roles.has_multiple_roles && (
            <span className="text-xs text-purple-600 font-medium">🔄 Multi-role</span>
          )}
        </div>
      );
    },
  },
  {
    header: "Actions",
    id: "actions",
    cell: ({ row, table }) => {
      const id = row.original.id
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button data-id={id} variant="outline" size="sm" className="px-2 py-1 h-auto text-xs"
              onClick={() => (table.options.meta as any)?.onOpenEdit?.(id)}
            >
              Edit
            </Button>
            <Button data-id={id} variant="outline" size="sm" className="px-2 py-1 h-auto text-xs"
              onClick={() => (table.options.meta as any)?.onOpenRoles?.(id)}
            >
              🎭 Roles
            </Button>
          </div>
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

  // Role management state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedEmployeeForRoles, setSelectedEmployeeForRoles] = useState<EmployeeRow | null>(null);

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

  // Role management handlers
  const handleOpenRoles = useCallback(async (id: number) => {
    const employee = data.find(emp => emp.id === id);
    if (employee) {
      setSelectedEmployeeForRoles(employee);
      setRoleDialogOpen(true);
    }
  }, [data]);

  const handleCloseRoles = useCallback(() => {
    setRoleDialogOpen(false);
    setSelectedEmployeeForRoles(null);
  }, []);

  const handleRolesSaved = useCallback(() => {
    router.refresh(); // Refresh page to show updated data
  }, [router]);
  const [formData, setFormData] = useState({
    nip: '',
    fullname: '',
    division_id: '',
    position_id: '',
    gaji_pokok: '',
    tmt_kerja: '',
    tempat_lahir: '',
    tanggal_lahir: '',
  })
  const [divisions, setDivisions] = useState<{ id: number; name: string }[]>([])
  const [positions, setPositions] = useState<{ id: number; name: string }[]>([])

  const handleOpenEdit = useCallback(async (id: number) => {
    setEditingId(id)
    setErrorMsg("")
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
    setFormData({
      nip: data.nip || '',
      fullname: data.fullname || '',
      division_id: data.division?.id?.toString?.() ?? '',
      position_id: data.position?.id?.toString?.() ?? '',
      gaji_pokok: data.gaji_pokok?.toString?.() ?? '',
      tmt_kerja: data.tmt_kerja || '',
      tempat_lahir: data.tempat_lahir || '',
      tanggal_lahir: data.tanggal_lahir || '',
    })
    setEditOpen(true)
  }, [])
  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  const handleSave = useCallback(async () => {
    if (!editingId) return
    setSaving(true)
    setErrorMsg("")
    try {
      const payload: any = {
        nip: formData.nip,
        fullname: formData.fullname || null,
        division_id: formData.division_id || null,
        position_id: formData.position_id || null,
        gaji_pokok: formData.gaji_pokok ? formData.gaji_pokok : null,
        tmt_kerja: formData.tmt_kerja || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
      }
      const resp = await fetch(`/api/admin/employees/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({} as any))
      if (!resp.ok) throw new Error(data?.detail || 'Failed to update employee')
      setEditOpen(false)
      router.refresh()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [editingId, formData, router])
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      onDelete: handleDelete,
      onOpenEdit: handleOpenEdit,
      onOpenRoles: handleOpenRoles
    },
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
          placeholder="Filter Position"
          value={(table.getColumn('position')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('position')?.setFilterValue(e.target.value)}
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
        <Input
          placeholder="Filter Roles"
          value={(table.getColumn('roles')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('roles')?.setFilterValue(e.target.value)}
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
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[560px] max-w-[95vw] p-4">
            <Dialog.Title className="text-lg font-semibold">Edit Employee</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">Update employee details</Dialog.Description>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fullname">Full Name</Label>
                <Input id="fullname" name="fullname" value={formData.fullname} onChange={onChange} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" name="nip" value={formData.nip} onChange={onChange} />
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
              {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{errorMsg}</div>}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Role Management Dialog */}
      {selectedEmployeeForRoles && (
        <RoleManagement
          employeeId={selectedEmployeeForRoles.id}
          employeeName={selectedEmployeeForRoles.fullname || selectedEmployeeForRoles.user.username}
          currentRoles={
            selectedEmployeeForRoles.roles?.active_roles.map(roleName => ({
              id: 0, // Will be populated in component
              group: { id: 0, name: roleName },
              is_primary: roleName === selectedEmployeeForRoles.roles?.primary_role,
              is_active: true
            })) || []
          }
          isOpen={roleDialogOpen}
          onClose={handleCloseRoles}
          onSave={handleRolesSaved}
        />
      )}
    </div>
  );
}


