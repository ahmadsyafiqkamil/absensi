"use client";

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pending Approvals" subtitle="Koreksi absensi menunggu persetujuan Anda" username={me?.username || ''} role={role} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pengajuan Pending</CardTitle>
            <CardDescription>Hanya menampilkan pegawai dalam divisi Anda.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>}
            {loading ? (
              <div className="text-gray-600">Memuat...</div>
            ) : items.length === 0 ? (
              <div className="text-gray-600">Tidak ada pengajuan pending.</div>
            ) : (
              <div className="grid gap-2">
                {items.map((it) => (
                  <div key={it.id} className="border rounded p-3 text-sm">
                    <div className="flex justify-between">
                      <div className="font-medium">{it.date_local} — {it.type.replaceAll('_',' ')}</div>
                      <div className="text-xs text-amber-600">{it.status}</div>
                    </div>
                    {it.user && (
                      <div className="text-xs text-gray-600">
                        Diajukan oleh: {it.user.first_name} {it.user.last_name} ({it.user.username})
                      </div>
                    )}
                    <div className="text-xs text-gray-600">Diajukan: {new Date(it.created_at).toLocaleString()}</div>
                    {it.proposed_check_in_local && <div>Usulan In: {it.proposed_check_in_local}</div>}
                    {it.proposed_check_out_local && <div>Usulan Out: {it.proposed_check_out_local}</div>}
                    {it.attachment && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-600">Surat Pendukung: </span>
                        <a 
                          href={getMediaUrl(it.attachment)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline text-xs font-medium"
                          title={`Download ${getFilename(it.attachment)}`}
                        >
                          📎 {getFilename(it.attachment)}
                        </a>
                      </div>
                    )}
                    <div className="mt-2">Alasan: {it.reason}</div>
                    <div className="mt-3 flex gap-2">
                      <Button 
                        onClick={() => act(it.id, 'approve')} 
                        disabled={it.status !== 'pending' || submittingId === it.id || (it.type === 'missing_check_in' && !it.proposed_check_in_local) || (it.type === 'missing_check_out' && !it.proposed_check_out_local)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => act(it.id, 'reject')} 
                        disabled={it.status !== 'pending' || submittingId === it.id}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
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


