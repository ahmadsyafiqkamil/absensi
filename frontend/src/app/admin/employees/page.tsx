import { meFromServerCookies, BACKEND_BASE_URL } from '@/lib/backend';
import Header from '@/components/Header';
import { cookies } from 'next/headers';
import Link from 'next/link';
import EmployeesTable from '@/components/tables/EmployeesTable';

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

async function getEmployees(page: number, pageSize: number): Promise<PaginatedEmployees> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { count: 0, next: null, previous: null, results: [] }
  const url = new URL(`${BACKEND_BASE_URL}/api/admin/employees-with-roles/`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return { count: 0, next: null, previous: null, results: [] }

  const data = await res.json()

  // Transform data to match frontend expectations
  const transformedResults = data.results.map((employee: any) => ({
    ...employee,
    roles: {
      active_roles: employee.roles || [],
      primary_role: employee.primary_role || null,
      role_names: employee.roles?.map((role: any) => role.group_name) || [],
      has_multiple_roles: (employee.roles?.length || 0) > 1,
      total_roles: employee.roles?.length || 0,
      role_categories: employee.roles?.map((role: any) => role.group_name) || []
    }
  }))

  return {
    ...data,
    results: transformedResults
  }
}

export default async function AdminEmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const meResp = await meFromServerCookies()
  const { resp, data: me } = meResp
  if (!resp.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You are not authorized to view this page.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Return to Home</a>
        </div>
      </div>
    )
  }

  const isAdmin = me.is_superuser || (me.groups || []).includes('admin')
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Admin privileges required.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">Return to Home</a>
        </div>
      </div>
    )
  }

  const sp = await searchParams
  const page = Number(sp?.page ?? '1') || 1
  const pageSize = Number(sp?.page_size ?? '20') || 20
  const data = await getEmployees(page, pageSize)
  const employees = data.results
  const role = (me.groups || []).includes('admin') ? 'admin' : 'superuser'
  const totalPages = Math.max(1, Math.ceil((data.count || 0) / pageSize))
  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Employees" 
        subtitle="All registered employees"
        username={me.username}
        role={role}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">Total: {data.count} • Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Link href={{ pathname: '/admin/employees', query: { page: prevPage, page_size: pageSize } }}>
              <span className={`px-3 py-1 border rounded text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}>Prev</span>
            </Link>
            <Link href={{ pathname: '/admin/employees', query: { page: nextPage, page_size: pageSize } }}>
              <span className={`px-3 py-1 border rounded text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}>Next</span>
            </Link>
          </div>
        </div>
        <EmployeesTable data={employees} />
        <div className="flex items-center justify-end mt-4 gap-2">
          <Link href={{ pathname: '/admin/employees', query: { page: prevPage, page_size: pageSize } }}>
            <span className={`px-3 py-1 border rounded text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}>Prev</span>
          </Link>
          <Link href={{ pathname: '/admin/employees', query: { page: nextPage, page_size: pageSize } }}>
            <span className={`px-3 py-1 border rounded text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}>Next</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


