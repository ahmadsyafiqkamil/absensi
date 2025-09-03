import { meFromServerCookies } from '@/lib/backend';
import Header from '@/components/Header';
import OvertimeRequestsApproval from './OvertimeRequestsApproval';
import MonthlySummaryRequestsApproval from './MonthlySummaryRequestsApproval';

async function getMe() {
  const { resp, data } = await meFromServerCookies()
  if (!resp.ok) return null
  return data
}

export default async function SupervisorOvertimeRequestsPage() {
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

  const approvalLevel = me?.approval_level || 0
  const hasApprovalPermission = approvalLevel > 0

  if (!hasApprovalPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Supervisor privileges required (approval level 1 or higher).</p>
          <p className="text-sm text-gray-500 mt-1">
            Current approval level: {approvalLevel}
          </p>
          <div className="mt-2 text-xs text-gray-400">
            <p>Active roles: {me?.multi_roles?.active_roles?.join(', ') || 'None'}</p>
            <p>Primary role: {me?.multi_roles?.primary_role || 'None'}</p>
          </div>
          <a href="/" className="text-blue-600 hover:underline mt-4 inline-block">
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  const role = (me?.groups || []).includes('admin') ? 'admin' : 'supervisor'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Persetujuan Lembur" 
        subtitle="Kelola pengajuan lembur dan rekap bulanan dari tim Anda"
        username={me.username}
        role={role}
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Persetujuan Pengajuan Lembur & Rekap Bulanan</h1>
          <p className="text-gray-600 mt-2">
            Tinjau dan setujui pengajuan lembur dan rekap bulanan dari anggota tim Anda
          </p>
        </div>

        {/* Overtime Requests Approval */}
        <OvertimeRequestsApproval />
        
        {/* Monthly Summary Requests Approval */}
        <div className="mt-12">
          <MonthlySummaryRequestsApproval />
        </div>
      </div>
    </div>
  );
}
