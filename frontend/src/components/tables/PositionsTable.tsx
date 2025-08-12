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

export type PositionRow = { id: number; name: string };

const columns: ColumnDef<PositionRow>[] = [
  {
    header: "ID",
    accessorKey: "id",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<number>())}</span>,
  },
  {
    header: "Name",
    accessorKey: "name",
    cell: ({ getValue }) => <span className="text-gray-900 text-sm">{String(getValue<string>())}</span>,
  },
  {
    header: "Actions",
    id: "actions",
    cell: ({ row, table }) => {
      const id = row.original.id
      return (
        <div className="flex gap-2">
          <Button data-id={id} variant="outline" size="sm" className="px-2 py-1 h-auto text-xs"
            onClick={() => (table.options.meta as any)?.onOpenEdit?.(id)}
          >
            Edit
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

export default function PositionsTable({ data }: { data: PositionRow[] }) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this position?')) return;
    const resp = await fetch(`/api/admin/positions/${id}`, { method: 'DELETE' })
    if (resp.ok || resp.status === 204) {
      router.refresh()
    } else {
      const data = await resp.json().catch(() => ({} as any))
      alert(data?.detail || 'Failed to delete')
    }
  }, [router])
  const handleOpenEdit = useCallback(async (id: number) => {
    setEditingId(id)
    setErrorMsg("")
    const resp = await fetch(`/api/admin/positions/${id}`)
    const d = await resp.json().catch(() => ({} as any))
    if (!resp.ok) {
      alert(d?.detail || 'Failed to load position')
      return
    }
    setEditName(d.name || "")
    setEditOpen(true)
  }, [])
  const handleSave = useCallback(async () => {
    if (!editingId) return
    setSaving(true)
    setErrorMsg("")
    try {
      const resp = await fetch(`/api/admin/positions/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      })
      const data = await resp.json().catch(() => ({} as any))
      if (!resp.ok) throw new Error(data?.detail || 'Failed to update position')
      setEditOpen(false)
      router.refresh()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [editingId, editName, router])
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
      <div className="p-3 grid gap-2 md:grid-cols-2 grid-cols-1 border-b bg-gray-50">
        <Input
          placeholder="Filter ID"
          value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('id')?.setFilterValue(e.target.value)}
        />
        <Input
          placeholder="Filter Name"
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
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
                No positions found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[480px] max-w-[95vw] p-4">
            <Dialog.Title className="text-lg font-semibold">Edit Position</Dialog.Title>
            <Dialog.Description className="text-sm text-gray-500 mb-4">Update position details</Dialog.Description>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
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
    </div>
  );
}


