import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import { cookies } from 'next/headers';
import Link from 'next/link';
import PositionsTable from '@/components/tables/PositionsTable';

type PositionRow = {
  id: number;
  name: string;
}

type PaginatedPositions = {
  count: number
  next: string | null
  previous: string | null
  results: PositionRow[]
}

async function getPositions(page: number, pageSize: number): Promise<PaginatedPositions> {
  const token = (await cookies()).get('access_token')?.value
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
  const url = new URL(`${backend}/api/positions/`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('page_size', String(pageSize))
  const res = await fetch(url.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })
  if (!res.ok) return { count: 0, next: null, previous: null, results: [] }
  return res.json()
}

export default async function AdminPositionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
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
  const data = await getPositions(page, pageSize)
  const positions = data.results
  const role = (me.groups || []).includes('admin') ? 'admin' : 'superuser'
  const totalPages = Math.max(1, Math.ceil((data.count || 0) / pageSize))
  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Positions" 
        subtitle="All job positions"
        username={me.username}
        role={role}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Positions</h1>
            <p className="text-gray-600">All registered positions</p>
          </div>
          <a href="/admin/positions/add" className="px-3 py-2 text-sm rounded border hover:bg-gray-50">Add Position</a>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">Total: {data.count} • Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Link href={{ pathname: '/admin/positions', query: { page: prevPage, page_size: pageSize } }}>
              <span className={`px-3 py-1 border rounded text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}>Prev</span>
            </Link>
            <Link href={{ pathname: '/admin/positions', query: { page: nextPage, page_size: pageSize } }}>
              <span className={`px-3 py-1 border rounded text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}>Next</span>
            </Link>
          </div>
        </div>

        <PositionsTable data={positions} />
        <div className="flex items-center justify-end mt-4 gap-2">
          <Link href={{ pathname: '/admin/positions', query: { page: prevPage, page_size: pageSize } }}>
            <span className={`px-3 py-1 border rounded text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}>Prev</span>
          </Link>
          <Link href={{ pathname: '/admin/positions', query: { page: nextPage, page_size: pageSize } }}>
            <span className={`px-3 py-1 border rounded text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : ''}`}>Next</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


