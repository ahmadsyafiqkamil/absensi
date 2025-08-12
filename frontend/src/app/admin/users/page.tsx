import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import { cookies } from 'next/headers';

type UserRow = {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  groups: string[];
}

async function getUsers(): Promise<UserRow[]> {
  const token = (await cookies()).get('access_token')?.value
  if (!token) return []
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
  const res = await fetch(`${backend}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function AdminUsersPage() {
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

  const users = await getUsers()
  const role = (me.groups || []).includes('admin') ? 'admin' : 'superuser'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="User Management" 
        subtitle="View all registered users"
        username={me.username}
        role={role}
      />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">All registered users</p>
        </div>

        <div className="overflow-x-auto bg-white border rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Superuser</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{u.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{u.username}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{u.email || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{(u.groups || []).join(', ') || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{u.is_superuser ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


