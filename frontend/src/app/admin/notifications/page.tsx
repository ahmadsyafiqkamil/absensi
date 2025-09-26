import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import AdminNotificationsList from '../../../components/notifications/AdminNotificationsList';
import Link from 'next/link';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function AdminNotificationsPage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Anda tidak berwenang melihat halaman ini.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  const groups: string[] = me?.groups || []
  const isAdmin = groups.includes('admin') || me?.is_superuser

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Hak administrator diperlukan.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header 
        title="Manajemen Notifikasi" 
        subtitle="Kelola notifikasi untuk seluruh pengguna"
        username={me.username}
        role={me.groups?.includes('admin') ? 'admin' : 'superuser'}
      />
      
      <AdminNotificationsList />
    </div>
  );
}