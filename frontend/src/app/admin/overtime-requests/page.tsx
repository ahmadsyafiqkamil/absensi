import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import AdminOvertimeRequestsClient from '@/app/admin/overtime-requests/AdminOvertimeRequestsClient';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function AdminOvertimeRequestsPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You are not authorized to view this page.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </a>
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
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Overtime Requests Management" 
        subtitle="Manage all overtime requests with 2-level approval system"
        username={me.username}
        role="admin"
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Overtime Requests</h1>
          <p className="text-gray-600 mt-2">
            View and manage all overtime requests with 2-level approval system
          </p>
        </div>

        {/* Overtime Requests Management */}
        <AdminOvertimeRequestsClient />
      </div>
    </div>
  );
}
