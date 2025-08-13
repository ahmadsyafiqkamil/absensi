import { meFromServerCookies } from '@/lib/backend'
import Header from '@/components/Header'
import SettingsClient from './settingsClient'

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function AdminSettingsPage() {
  const me = await getMe()
  if (!me) {
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

  const role = (me.groups || []).includes('admin') ? 'admin' : 'superuser'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="System Settings" subtitle="Pengaturan jam kerja dan hari libur" username={me.username} role={role} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <SettingsClient />
      </div>
    </div>
  )
}


