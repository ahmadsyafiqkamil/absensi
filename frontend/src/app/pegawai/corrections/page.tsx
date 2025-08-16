"use client";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import * as Dialog from '@radix-ui/react-dialog'
import Header from '@/components/Header'

type Correction = {
  id: number
  date_local: string
  type: 'missing_check_in' | 'missing_check_out' | 'edit'
  proposed_check_in_local?: string | null
  proposed_check_out_local?: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  decision_note?: string | null
  created_at: string
}

export default function CorrectionsPage() {
  const [items, setItems] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ username: string; groups: string[]; is_superuser: boolean } | null>(null)

  // form state
  const [dateLocal, setDateLocal] = useState<string>('')
  const [type, setType] = useState<'missing_check_in' | 'missing_check_out' | 'edit'>('missing_check_in')
  const [checkInLocal, setCheckInLocal] = useState<string>('')
  const [checkOutLocal, setCheckOutLocal] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/attendance-corrections')
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

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/auth/me')
        if (r.ok) {
          const d = await r.json()
          setMe({ username: d.username, groups: d.groups || [], is_superuser: !!d.is_superuser })
        }
      } catch {}
    })()
  }, [])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const payload: any = { date_local: dateLocal, type, reason }
      if (checkInLocal) payload.proposed_check_in_local = checkInLocal
      if (checkOutLocal) payload.proposed_check_out_local = checkOutLocal
      const resp = await fetch('/api/attendance-corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.detail || 'Gagal mengajukan koreksi')
      // reset form
      setDateLocal(''); setCheckInLocal(''); setCheckOutLocal(''); setReason(''); setType('missing_check_in')
      setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengajukan koreksi')
    } finally {
      setSubmitting(false)
    }
  }

  const role = me?.is_superuser ? 'admin' : (me?.groups?.includes('admin') ? 'admin' : (me?.groups?.includes('supervisor') ? 'supervisor' : 'pegawai'))

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Perbaikan Absensi" subtitle="Ajukan koreksi check-in/out Anda" username={me?.username || ''} role={role} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-end">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button>Ajukan Perbaikan</Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/40" />
              <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[520px] max-w-[95vw] p-4">
                <Dialog.Title className="text-lg font-semibold">Ajukan Perbaikan Absensi</Dialog.Title>
                <Dialog.Description className="text-sm text-gray-500 mb-3">Isi data di bawah ini untuk mengajukan koreksi.</Dialog.Description>
                <div className="grid gap-3">
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>}
                  <div className="grid gap-2">
                    <label className="text-sm">Tanggal (YYYY-MM-DD)</label>
                    <input value={dateLocal} onChange={(e) => setDateLocal(e.target.value)} className="border rounded p-2 text-sm" placeholder="2025-08-16" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Jenis Koreksi</label>
                    <select value={type} onChange={(e) => setType(e.target.value as any)} className="border rounded p-2 text-sm">
                      <option value="missing_check_in">Lupa Check-in</option>
                      <option value="missing_check_out">Lupa Check-out</option>
                      <option value="edit">Ubah Jam Masuk/Pulang</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Jam Check-in (lokal) - opsional</label>
                    <input value={checkInLocal} onChange={(e) => setCheckInLocal(e.target.value)} className="border rounded p-2 text-sm" placeholder="2025-08-16T09:15:00" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Jam Check-out (lokal) - opsional</label>
                    <input value={checkOutLocal} onChange={(e) => setCheckOutLocal(e.target.value)} className="border rounded p-2 text-sm" placeholder="2025-08-16T17:05:00" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm">Alasan</label>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="border rounded p-2 text-sm" placeholder="Jelaskan alasan Anda"></textarea>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Dialog.Close asChild>
                      <Button variant="outline" onClick={() => setError(null)} disabled={submitting}>Batal</Button>
                    </Dialog.Close>
                    <Button onClick={submit} disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim Pengajuan'}</Button>
                  </div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Pengajuan</CardTitle>
              <CardDescription>Daftar pengajuan koreksi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {loading ? (
                <div className="text-gray-600">Memuat...</div>
              ) : items.length === 0 ? (
                <div className="text-gray-600">Belum ada pengajuan.</div>
              ) : (
                <div className="grid gap-2">
                  {items.map((it) => (
                    <div key={it.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between">
                        <div className="font-medium">{it.date_local} — {it.type.replaceAll('_',' ')}</div>
                        <div className={`text-xs ${it.status === 'approved' ? 'text-green-600' : it.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{it.status}</div>
                      </div>
                      <div className="text-xs text-gray-600">Diajukan: {new Date(it.created_at).toLocaleString()}</div>
                      {it.proposed_check_in_local && <div>Usulan In: {it.proposed_check_in_local}</div>}
                      {it.proposed_check_out_local && <div>Usulan Out: {it.proposed_check_out_local}</div>}
                      <div>Alasan: {it.reason}</div>
                      {it.decision_note && <div>Catatan Reviewer: {it.decision_note}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


