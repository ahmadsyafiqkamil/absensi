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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Edit, Trash2, Eye, User } from "lucide-react";

export type EmployeeRow = {
  id: number;
  nip: string;
  fullname?: string | null;
  user: { id: number; username: string; email: string };
  division?: { id: number; name: string } | null;
  position?: { id: number; name: string } | null; // Legacy field
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
    cell: ({ getValue }) => (
      <span className="font-mono text-sm text-gray-600">
        #{String(getValue<number>())}
      </span>
    ),
  },
  {
    header: "NIP",
    accessorKey: "nip",
    cell: ({ getValue }) => (
      <Badge variant="secondary" className="font-mono">
        {String(getValue<string>())}
      </Badge>
    ),
  },
  {
    header: "Full Name",
    accessorKey: "fullname",
    cell: ({ getValue }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-400" />
        <span className="font-medium">
          {String(getValue<string>() ?? 'N/A')}
        </span>
      </div>
    ),
  },
  {
    header: "Username",
    accessorFn: (row) => row.user?.username ?? "-",
    id: "username",
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-700">
        {String(getValue<string>())}
      </span>
    ),
  },
  {
    header: "Email",
    accessorFn: (row) => row.user?.email ?? "-",
    id: "email",
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-700">
        {String(getValue<string>())}
      </span>
    ),
  },
  {
    header: "Division",
    accessorFn: (row) => row.division?.name ?? "-",
    id: "division",
    cell: ({ getValue }) => (
      <Badge variant="outline" className="text-xs">
        {String(getValue<string>())}
      </Badge>
    ),
  },
  {
    header: "Primary Position",
    accessorFn: (row) => row.primary_position?.name ?? row.position?.name ?? "-",
    id: "primary_position",
    cell: ({ getValue }) => (
      <Badge variant="outline" className="text-xs">
        {String(getValue<string>())}
      </Badge>
    ),
  },
  {
    header: "Positions",
    accessorKey: "employee_positions",
    cell: ({ row }) => {
      const positions = row.original.employee_positions || [];
      const legacyPosition = row.original.position;
      const totalCount = positions.length || (legacyPosition ? 1 : 0);
      
      if (totalCount === 0) {
        return <Badge variant="destructive" className="text-xs">No Position</Badge>;
      }
      
      if (totalCount === 1) {
        const singlePos = positions[0]?.position || legacyPosition;
        return (
          <Badge variant="secondary" className="text-xs">
            {singlePos?.name}
          </Badge>
        );
      }
      
      // Multiple positions - show count and primary
      const primaryPos = positions.find(p => p.is_primary)?.position;
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="default" className="text-xs">
            {totalCount} positions
          </Badge>
          {primaryPos && (
            <Badge variant="outline" className="text-xs">
              Primary: {primaryPos.name}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    header: "Approval Level",
    accessorFn: (row) => row.approval_capabilities?.approval_level ?? 0,
    id: "approval_level",
    cell: ({ getValue }) => {
      const level = getValue<number>();
      const variant = level >= 2 ? 'default' : level >= 1 ? 'secondary' : 'destructive';
      return (
        <Badge variant={variant} className="text-xs">
          Level {level}
        </Badge>
      );
    },
  },
  {
    header: "Salary",
    accessorFn: (row) => row.gaji_pokok ?? "-",
    id: "gaji_pokok",
    cell: ({ getValue }) => {
      const value = getValue<string>();
      if (value === "-") return <span className="text-gray-400">-</span>;
      return (
        <span className="font-medium text-green-600">
          AED {Number(value).toLocaleString()}
        </span>
      );
    },
  },
  {
    header: "Actions",
    id: "actions",
    cell: ({ row }) => {
      const employee = row.original;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Employee
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Employee
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

interface EmployeesTableProps {
  data: EmployeeRow[];
}

export default function EmployeesTableShadcn({ data }: EmployeesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const router = useRouter();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="global-filter" className="sr-only">
            Search employees
          </Label>
          <Input
            id="global-filter"
            placeholder="Search all employees..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button variant="outline" size="sm">
          Filter
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No employees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Showing {table.getFilteredRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} results
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
