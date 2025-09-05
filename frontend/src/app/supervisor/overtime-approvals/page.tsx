import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import OvertimeApprovalsClient from './OvertimeApprovalsClient'
import { getApprovalCapabilities } from '@/lib/approval-utils'
import { getBackendUrl } from '@/lib/api-utils'

export default async function SupervisorOvertimeApprovalsPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value

  if (!accessToken) {
    redirect('/login')
  }

  // Verify supervisor role
  const resp = await fetch(`${getBackendUrl()}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store'
  })

  if (!resp.ok) {
    redirect('/login')
  }

  const me = await resp.json().catch(() => ({} as any))
  
  // Check position-based approval level instead of group membership
  const position = me?.position || null
  const approvalCapabilities = getApprovalCapabilities(position)
  const hasApprovalPermission = approvalCapabilities.division_level || approvalCapabilities.organization_level
  
  if (!hasApprovalPermission) {
    redirect('/supervisor')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title="Overtime Approvals" 
        subtitle="Review and approve overtime requests from your division"
        username={me.username} 
        role="supervisor" 
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <OvertimeApprovalsClient />
      </div>
    </div>
  )
}
