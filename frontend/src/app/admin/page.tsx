import { meFromServerCookies } from '@/lib/backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Header from '@/components/Header';
import AdminApprovalSummary from './AdminApprovalSummary';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function AdminPage() {
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
        title="Dashboard Admin" 
        subtitle="Kelola sistem, pengguna, dan data"
        username={me.username}
        role={me.groups?.includes('admin') ? 'admin' : 'superuser'}
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Admin Functions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          

          {/* Employee Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Manajemen Pegawai
              </CardTitle>
              <CardDescription>Kelola catatan dan detail pegawai</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/add-user">
                <Button variant="outline" className="w-full">Tambah Pegawai</Button>
              </Link>
              <Link href="/admin/employees">
                <Button variant="outline" className="w-full">Lihat Pegawai</Button>
              </Link>
              {/* <Link href="/admin/employees/add">
                <Button variant="outline" className="w-full">Add Employee</Button>
              </Link> */}
            </CardContent>
          </Card>

          {/* Division Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manajemen Divisi
              </CardTitle>
              <CardDescription>Kelola divisi organisasi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/divisions">
                <Button variant="outline" className="w-full">Lihat Divisi</Button>
              </Link>
              <Link href="/admin/divisions/add">
                <Button variant="outline" className="w-full">Tambah Divisi</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Position Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Manajemen Jabatan
              </CardTitle>
              <CardDescription>Kelola posisi pekerjaan dan penugasan pegawai</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/positions">
                <Button variant="outline" className="w-full">Lihat Jabatan</Button>
              </Link>
              <Link href="/admin/positions/add">
                <Button variant="outline" className="w-full">Tambah Jabatan</Button>
              </Link>
              {/* <Link href="/admin/employee-positions">
                <Button className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Multi-Position Management
                </Button>
              </Link> */}
            </CardContent>
          </Card>

          {/* Group Management */}
          {/* <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Group Management
              </CardTitle>
              <CardDescription>Manage user groups and permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/groups">
                <Button variant="outline" className="w-full">View Groups</Button>
              </Link>
              <Link href="/admin/groups/add">
                <Button variant="outline" className="w-full">Add Group</Button>
              </Link>
            </CardContent>
          </Card> */}

          {/* System Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Pengaturan Sistem
              </CardTitle>
              <CardDescription>Konfigurasi parameter sistem</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/settings">
                <Button variant="outline" className="w-full">Lihat Pengaturan</Button>
              </Link>
              <Link href="/admin/logs">
                <Button variant="outline" className="w-full">Log Sistem</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Overtime Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Manajemen Lembur
              </CardTitle>
              <CardDescription>Kelola permintaan lembur dengan persetujuan 2 level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/overtime-requests">
                <Button variant="outline" className="w-full">Lihat Permintaan Lembur</Button>
              </Link>
              <Link href="/admin/positions">
                <Button variant="outline" className="w-full">Konfigurasi Level Persetujuan</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z" />
                </svg>
                Manajemen Notifikasi
              </CardTitle>
              <CardDescription>Kelola notifikasi untuk seluruh pengguna</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/notifications">
                <Button variant="outline" className="w-full">Lihat Notifikasi</Button>
              </Link>
              <Link href="/admin/notifications/create">
                <Button variant="outline" className="w-full">Buat Notifikasi</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Laporan & Analitik
              </CardTitle>
              <CardDescription>Buat laporan dan lihat analitik</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/reports/users">
                <Button variant="outline" className="w-full">Laporan Pengguna</Button>
              </Link>
              <Link href="/admin/reports/employees">
                <Button variant="outline" className="w-full">Laporan Pegawai</Button>
              </Link>
            </CardContent>
          </Card>
        </div>


        {/* Quick Stats */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistik Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Total Pengguna</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Pegawai</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Divisi</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-600">Jabatan</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">0</div>
                <div className="text-sm text-gray-600">Grup</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Overtime Approval Summary */}
        <AdminApprovalSummary />

      </div>
    </div>
  );
}
