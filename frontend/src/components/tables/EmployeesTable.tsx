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

export type EmployeeRow = {
  id: number;
  nip: string;
  user: { id: number; username: string; email: string };
  division?: { id: number; name: string } | null;
  position?: { id: number; name: string } | null;
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
];

export default function EmployeesTable({ data }: { data: EmployeeRow[] }) {
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
    </div>
  );
}


