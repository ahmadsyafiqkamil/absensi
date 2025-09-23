"use client";

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ApprovalLevelWarning } from '@/components/ui/approval-level-warning'
import { PositionSwitcher } from '@/components/PositionSwitcher'
import { useSupervisorApprovalLevel } from '@/lib/hooks'
import { DataTable } from './data-table'
import { columns, type AttendanceCorrection } from './columns'
import { ApprovalActions } from './approval-actions'

interface WorkSettings {
  id: number;
  timezone: string;
  work_start_time: string;
  work_end_time: string;
  lateness_threshold_minutes: number;
  workdays: number[];
  office_latitude: string;
  office_longitude: string;
  geofence_radius_meters: number;
}

export default function ApprovalsPage() {
  const { approvalLevel, canApprove, isLevel0, loading: approvalLevelLoading } = useSupervisorApprovalLevel()
  const [me, setMe] = useState<{ username: string; groups: string[] } | null>(null)
  const [items, setItems] = useState<AttendanceCorrection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<number | null>(null)
  const [workSettings, setWorkSettings] = useState<WorkSettings | null>(null)

  // Fetch work settings
  const fetchWorkSettings = async () => {
    try {
      const response = await fetch('/api/v2/settings/work');
      if (response.ok) {
        const data = await response.json();
        setWorkSettings(data);
      }
    } catch (error) {
      console.error('Error fetching work settings:', error);
    }
  };

  useEffect(() => {
    ;(async () => {
      const r = await fetch('/api/v2/auth/me/')
      if (r.ok) setMe(await r.json())
    })()
  }, [])

  useEffect(() => {
    fetchWorkSettings();
  }, [])

  async function load() {
    console.log('=== LOAD FUNCTION CALLED ===')
    setLoading(true)
    setError(null)
    try {
      console.log('=== FETCHING DATA ===')
      // Use V2 API endpoint for supervisor corrections
      const resp = await fetch('/api/v2/corrections/supervisor/?status=pending', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      console.log('=== RESPONSE RECEIVED ===', { status: resp.status, ok: resp.ok })
      
      const data = await resp.json().catch(() => ({}))
      console.log('=== DATA PARSED ===', data)
      
      const list = Array.isArray(data) ? data : (data.results || [])
      console.log('=== LIST PROCESSED ===', { list, listLength: list.length })
      
      setItems(list)
      console.log('=== ITEMS SET ===', { 
        list, 
        response: data, 
        listLength: list.length,
        firstItem: list[0],
        firstItemUser: list[0]?.user,
        firstItemEmployee: list[0]?.employee,
        firstItemType: list[0]?.type
      })
    } catch (e) {
      console.error('=== ERROR IN LOAD ===', e)
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
      console.log('=== LOAD COMPLETED ===')
    }
  }

  useEffect(() => { load() }, [])
  
  // Auto-refresh sudah dihapus - data hanya di-refresh saat:
  // 1. Halaman pertama kali load
  // 2. Setelah approval/reject berhasil
  // 3. Manual refresh via tombol refresh

  async function act(id: number, action: 'approve' | 'reject', decisionNote: string) {
    if (isLevel0) {
      setError('Anda tidak memiliki permission untuk melakukan approval')
      return
    }

    setSubmittingId(id)
    setError(null)
    try {
      // Use V2 API endpoints for approval actions
      const path = `/api/v2/corrections/corrections/${id}/approve/`
      console.log('APPROVAL_ACTION_V2', { id, action, path })
      
      const resp = await fetch(path, { 
        method: 'POST', 
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          action: action,
          reason: decisionNote
        }) 
      })
      
      const d = await resp.json().catch(() => ({}))
      console.log('APPROVAL_RESPONSE_V2', { status: resp.status, ok: resp.ok, body: d })
      
      if (!resp.ok) {
        // Handle specific error cases
        if (d?.detail === 'invalid_status') {
          throw new Error('Record sudah tidak bisa di-approve/reject (status berubah)')
        } else if (d?.detail === 'proposed_check_out_local_required') {
          throw new Error('Data check-out yang diusulkan diperlukan untuk approval ini')
        } else if (d?.detail === 'proposed_check_in_local_required') {
          throw new Error('Data check-in yang diusulkan diperlukan untuk approval ini')
        } else if (d?.detail === 'one_of_check_in_or_out_required') {
          throw new Error('Minimal salah satu data check-in atau check-out yang diusulkan diperlukan untuk approval')
        } else if (d?.detail === 'division_not_configured') {
          throw new Error('Divisi tidak dikonfigurasi dengan benar')
        } else {
          throw new Error(d?.detail || 'Gagal memproses approval')
        }
      }
      
      // Success - refresh data
      await load()
      console.log('APPROVAL_SUCCESS_V2', { id, action, response: d })
      
    } catch (e) {
      console.error('APPROVAL_ERROR_V2', e)
      setError(e instanceof Error ? e.message : 'Gagal memproses')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleApprove = async (id: number, decisionNote: string) => {
    await act(id, 'approve', decisionNote)
  }

  const handleReject = async (id: number, decisionNote: string) => {
    await act(id, 'reject', decisionNote)
  }

  // Transform data to include approval actions
  const tableData = useMemo(() => {
    return items.map(item => ({
      ...item,
      actions: (
        <ApprovalActions
          correction={item}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={submittingId === item.id}
          isLevel0={isLevel0}
        />
      )
    }))
  }, [items, submittingId, isLevel0])

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
        {/* Position Switcher */}
        {/* <div className="mb-6">
          <PositionSwitcher />
        </div> */}

        {/* Approval Level Warning */}
        {approvalLevel !== null && (
          <ApprovalLevelWarning approvalLevel={approvalLevel} className="mb-6" />
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Attendance Corrections Management</CardTitle>
                <CardDescription>
                  {isLevel0 
                    ? 'You can view pending corrections but cannot approve them due to Level 0 permission'
                    : 'Review and approve attendance correction requests from your team members'
                  }
                </CardDescription>
              </div>
              {workSettings?.timezone && (
                <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  Timezone: {workSettings.timezone}
                </div>
              )}
            </div>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2">
              <div>Last updated: {new Date().toLocaleTimeString('id-ID')}</div>
              <div>Data count: {items.length} records</div>
              <div>Approval level: {approvalLevel} (Level {approvalLevel === 0 ? '0 - No Approval' : approvalLevel === 1 ? '1 - Can Approve' : '2+ - Admin Level'})</div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-800">{error}</div>
              </div>
            )}

            <DataTable
              columns={columns}
              data={tableData}
              onRefresh={load}
              loading={loading}
              meta={{ workSettings }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


