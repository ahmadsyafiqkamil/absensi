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
import { useState } from "react";
import { Input } from "@/components/ui/input";

export type DivisionRow = { id: number; name: string };

const columns: ColumnDef<DivisionRow>[] = [
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
];

export default function DivisionsTable({ data }: { data: DivisionRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
                No divisions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


