"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import EmployeesTable from '@/components/tables/EmployeesTable';
import DashboardLayout from '@/components/DashboardLayout';

type EmployeeRow = {
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
    active_roles: any[];
    primary_role: any | null;
    role_names: string[];
    has_multiple_roles: boolean;
    total_roles: number;
    role_categories: string[];
  };
}

type PaginatedEmployees = {
  count: number
  next: string | null
  previous: string | null
  results: EmployeeRow[]
}

type EmployeeStats = {
  total_employees: number;
  active_employees: number;
  inactive_employees: number;
  employees_by_division: Record<string, number>;
  employees_by_role: Record<string, number>;
  recent_hires: number;
  upcoming_birthdays: number;
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userInfo, setUserInfo] = useState<{username: string, role: string}>({username: '', role: ''});

  // Load employees data
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
        search: searchQuery,
        sort_by: 'name',
        sort_order: 'asc',
      });

      const response = await fetch(`/api/admin/employees?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load employees');
      }

      const data = await response.json();
      setEmployees(data.results);
      setTotalCount(data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery]);

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            username: data.username || 'User',
            role: data.groups?.[0] || data.role || 'User'
          });
        }
      } catch (err) {
        console.warn('Failed to load user info:', err);
      }
    };

    loadUserInfo();
  }, []);

  // Initialize data
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <DashboardLayout
      title="Daftar Pegawai"
      subtitle="Kelola data pegawai organisasi"
      username={userInfo.username}
      role={userInfo.role}
    >

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari pegawai berdasarkan nama, NIP, atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={loadEmployees} variant="outline">
                Cari
              </Button>
              <Button onClick={() => { setSearchQuery(''); loadEmployees(); }} variant="outline">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pegawai ({totalCount})</CardTitle>
            <CardDescription>
              Menampilkan data pegawai yang aktif dalam organisasi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Memuat data pegawai...</span>
              </div>
            ) : error ? (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            ) : (
              <EmployeesTable data={employees} />
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              Menampilkan {((currentPage - 1) * pageSize) + 1} sampai {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} pegawai
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                Sebelumnya
              </Button>
              <span className="px-3 py-2 text-sm">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
