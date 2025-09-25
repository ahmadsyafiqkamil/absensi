import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import OvertimeRequestsManager from '../OvertimeRequestsManager';
import MonthlySummaryRequestManager from '../MonthlySummaryRequestManager';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function PegawaiOvertimePage() {
  const me = await getMe()
  
  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Akses Ditolak</h1>
          <p className="text-gray-600 mt-2">Anda tidak berwenang melihat halaman ini.</p>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Manajemen Lembur" 
        subtitle="Lihat dan kelola catatan lembur Anda"
        username={me.username}
        role="pegawai"
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pengajuan Lembur</h1>
          <p className="text-gray-600 mt-2">
            Ajukan lembur dan pantau status persetujuan supervisor
          </p>
        </div>

        {/* Overtime Requests Manager */}
        <OvertimeRequestsManager />
        
        {/* Monthly Summary Request Manager */}
        <div className="mt-12">
          <MonthlySummaryRequestManager />
        </div>
      </div>
    </div>
  );
}
