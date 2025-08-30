"use client";

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApprovalLevelWarning } from '@/components/ui/approval-level-warning'
import { PermissionGuard, ApprovalButton } from '@/components/ui/permission-guard'
import { useSupervisorApprovalLevel } from '@/lib/hooks'

type Item = {
  id: number
  date_local: string
  type: string
  reason: string
  status: string
  created_at: string
  proposed_check_in_local?: string | null
  proposed_check_out_local?: string | null
  attachment?: string | null
  user?: {
    username: string
    first_name: string
    last_name: string
  }
}

export default function ApprovalsPage() {
  const { approvalLevel, canApprove, isLevel0, loading: approvalLevelLoading } = useSupervisorApprovalLevel()
  const [me, setMe] = useState<{ username: string; groups: string[] } | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const r = await fetch('/api/auth/me')
      if (r.ok) setMe(await r.json())
    })()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/attendance-corrections?status=pending')
      const data = await resp.json().catch(() => ({}))
      const list = Array.isArray(data) ? data : (data.results || [])
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function act(id: number, action: 'approve' | 'reject') {
    if (isLevel0) {
      setError('Anda tidak memiliki permission untuk melakukan approval')
      return
    }

    setSubmittingId(id)
    setError(null)
    try {
      const path = action === 'approve' ? `/api/attendance-corrections/${id}/approve` : `/api/attendance-corrections/${id}/reject`
      console.log('APPROVAL_ACTION', { id, action, path })
      const resp = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision_note: action === 'approve' ? 'Disetujui' : 'Ditolak' }) })
      const d = await resp.json().catch(() => ({}))
      console.log('APPROVAL_RESPONSE', { status: resp.status, ok: resp.ok, body: d })
      if (!resp.ok) throw new Error(d?.detail || 'Gagal memproses')
      await load()
    } catch (e) {
      console.error('APPROVAL_ERROR', e)
      setError(e instanceof Error ? e.message : 'Gagal memproses')
    } finally {
      setSubmittingId(null)
    }
  }

  // Function to get filename from attachment path
  function getFilename(attachmentPath: string) {
    if (!attachmentPath) return ''
    const parts = attachmentPath.split('/')
    return parts[parts.length - 1] || attachmentPath
  }

  // Function to construct full media URL through proxy
  function getMediaUrl(attachmentPath: string) {
    if (!attachmentPath) return ''
    // If absolute URL, return as-is routed through proxy if same host
    try {
      const url = new URL(attachmentPath)
      // If already absolute to backend, strip origin and route via proxy
      const pathname = url.pathname.startsWith('/media/') ? url.pathname : `/media${url.pathname}`
      return `/api/media${pathname}`
    } catch {
      // Not an absolute URL
      const path = attachmentPath.startsWith('/media/') ? attachmentPath : (attachmentPath.startsWith('media/') ? `/${attachmentPath}` : `/media/${attachmentPath}`)
      return `/api/media${path}`
    }
  }

  const role = me?.groups?.includes('admin') ? 'admin' : 'supervisor'

  if (loading || approvalLevelLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Approvals" subtitle="Review and approve attendance corrections" username={me?.username || ''} role={role} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Approvals" subtitle="Review and approve attendance corrections" username={me?.username || ''} role={role} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Approval Level Warning */}
        {approvalLevel !== null && (
          <ApprovalLevelWarning approvalLevel={approvalLevel} className="mb-6" />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending Attendance Corrections</CardTitle>
            <CardDescription>
              {isLevel0 
                ? 'You can view pending corrections but cannot approve them due to Level 0 permission'
                : 'Review and approve attendance correction requests from your team members'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending corrections found</div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">
                          {item.user?.first_name} {item.user?.last_name} ({item.user?.username})
                        </div>
                        <div className="text-sm text-gray-600">
                          Date: {new Date(item.date_local).toLocaleDateString('id-ID')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Type: {item.type.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-1">Reason:</div>
                      <div className="text-gray-600">{item.reason}</div>
                    </div>

                    {item.proposed_check_in_local && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Proposed Check-in:</div>
                        <div className="text-gray-600">
                          {new Date(item.proposed_check_in_local).toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}

                    {item.proposed_check_out_local && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Proposed Check-out:</div>
                        <div className="text-gray-600">
                          {new Date(item.proposed_check_out_local).toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}

                    {item.attachment && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Attachment:</div>
                        <a
                          href={getMediaUrl(item.attachment)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {getFilename(item.attachment)}
                        </a>
                      </div>
                    )}

                    <PermissionGuard requiredLevel={1} showWarning={true}>
                      <div className="flex space-x-2">
                        <ApprovalButton
                          onApprove={() => act(item.id, 'approve')}
                          disabled={submittingId === item.id}
                          loading={submittingId === item.id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {submittingId === item.id ? 'Processing...' : 'Approve'}
                        </ApprovalButton>
                        <ApprovalButton
                          onApprove={() => act(item.id, 'reject')}
                          disabled={submittingId === item.id}
                          loading={submittingId === item.id}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          {submittingId === item.id ? 'Processing...' : 'Reject'}
                        </ApprovalButton>
                      </div>
                    </PermissionGuard>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


