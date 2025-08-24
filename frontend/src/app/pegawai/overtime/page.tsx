import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import OvertimeRequestsManager from '../OvertimeRequestsManager';
import MonthlySummaryRequestCard from '@/app/pegawai/MonthlySummaryRequestCard';
import Link from 'next/link';

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
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">You are not authorized to view this page.</p>
          <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Overtime Management" 
        subtitle="View and manage your overtime records"
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
        
        {/* Monthly Summary Request Card */}
        <div className="mt-8">
          <MonthlySummaryRequestCard />
        </div>
      </div>
    </div>
  );
}
