"use client";

import { useCallback, useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'

type Precheck = { date_local: string; has_check_in: boolean; has_check_out: boolean }

// Custom event untuk refresh attendance data
const ATTENDANCE_REFRESH_EVENT = 'attendance-refresh'

export function triggerAttendanceRefresh() {
  window.dispatchEvent(new CustomEvent(ATTENDANCE_REFRESH_EVENT))
}

function useGeo() {
  const [loc, setLoc] = useState<{ lat: number; lng: number; acc: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const getLocation = useCallback(async () => {
    setError(null)
    setLocating(true)
    try {
      await new Promise<void>((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation tidak didukung browser'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords
            setLoc({ lat: Number(latitude.toFixed(5)), lng: Number(longitude.toFixed(5)), acc: Math.round(accuracy) })
            resolve()
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil lokasi')
    } finally {
      setLocating(false)
    }
  }, [])
  return { loc, locating, error, getLocation, setError }
}

export default function AttendanceWidget() {
  const [openIn, setOpenIn] = useState(false)
  const [openOut, setOpenOut] = useState(false)
  return (
    <div className="grid gap-3">
      <Dialog.Root open={openIn} onOpenChange={setOpenIn}>
        <Dialog.Trigger asChild>
          <Button className="w-full">Check In</Button>
        </Dialog.Trigger>
        <CheckModal kind="in" open={openIn} onClose={() => setOpenIn(false)} />
      </Dialog.Root>

      <Dialog.Root open={openOut} onOpenChange={setOpenOut}>
        <Dialog.Trigger asChild>
          <Button variant="outline" className="w-full">Check Out</Button>
        </Dialog.Trigger>
        <CheckModal kind="out" open={openOut} onClose={() => setOpenOut(false)} />
      </Dialog.Root>
    </div>
  )
}

function CheckModal({ kind, open, onClose }: { kind: 'in' | 'out'; open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [precheck, setPrecheck] = useState<Precheck | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { loc, locating, error: geoError, getLocation, setError: setGeoError } = useGeo()
  const [note, setNote] = useState('')

  const title = kind === 'in' ? 'Konfirmasi Check In' : 'Konfirmasi Check Out'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/attendance/precheck', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.detail || 'Gagal precheck')
      setPrecheck(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal precheck')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      // reset state each open
      setConfirming(false)
      setSubmitting(false)
      setGeoError(null)
      setError(null)
      setPrecheck(null)
      setNote('')
      setLoading(true)
      load()
    }
  }, [open, load, setGeoError])

  const submit = useCallback(async () => {
    if (!loc) return
    setSubmitting(true)
    setError(null)
    try {
      const path = kind === 'in' ? '/api/attendance/check-in' : '/api/attendance/check-out'
      const resp = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: loc.lat, lng: loc.lng, accuracy_m: loc.acc, employee_note: note || undefined }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.detail || 'Gagal submit')
      
      // Close modal
      onClose()
      
      // Trigger refresh event instead of reloading page
      triggerAttendanceRefresh()
      
      // Show success message briefly
      const successMsg = kind === 'in' ? 'Check In berhasil!' : 'Check Out berhasil!'
      console.log(successMsg)
      
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal submit')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }, [kind, loc, onClose, note])

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 bg-black/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-md shadow-lg w-[520px] max-w-[95vw] p-4">
        <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-500 mb-3">Tanggal: {precheck?.date_local ?? '-'}</Dialog.Description>
        {loading ? (
          <div className="text-gray-600">Memuat...</div>
        ) : (
          <div className="grid gap-3">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>}
            {geoError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{geoError}</div>}
            {kind === 'in' ? (
              precheck?.has_check_in ? (
                <div className="text-sm text-gray-700">Anda sudah check-in hari ini.</div>
              ) : (
                <>
                  <div className="text-sm">Ambil lokasi Anda terlebih dahulu.</div>
                  <Button variant="outline" onClick={getLocation} disabled={locating}>{locating ? 'Mengambil lokasi...' : 'Ambil Lokasi'}</Button>
                  {loc && (
                    <div className="text-xs text-gray-600">
                      Lokasi: {loc.lat}, {loc.lng} (±{loc.acc}m)
                      {/* Note: Geofence validation is now handled on backend */}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <label className="text-xs text-gray-600">Keterangan (opsional)</label>
                    <textarea className="border rounded p-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan keterlambatan (jika terlambat)"></textarea>
                  </div>
                  <Button disabled={!loc} onClick={() => setConfirming(true)}>Check In</Button>
                </>
              )
            ) : !precheck?.has_check_in ? (
              <div className="text-sm text-gray-700">Anda belum check-in hari ini.</div>
            ) : precheck?.has_check_out ? (
              <div className="text-sm text-gray-700">Anda sudah check-out hari ini.</div>
            ) : (
              <>
                <div className="text-sm">Ambil lokasi Anda terlebih dahulu.</div>
                                  <Button variant="outline" onClick={getLocation} disabled={locating}>{locating ? 'Mengambil lokasi...' : 'Ambil Lokasi'}</Button>
                {loc && (
                  <div className="text-xs text-gray-600">
                    Lokasi: {loc.lat}, {loc.lng} (±{loc.acc}m)
                    {/* Note: Geofence validation is now handled on backend */}
                  </div>
                )}
                <div className="grid gap-2">
                  <label className="text-xs text-gray-600">Keterangan (opsional)</label>
                  <textarea className="border rounded p-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan kurang jam kerja (jika kurang)"></textarea>
                </div>
                <Button disabled={!loc} onClick={() => setConfirming(true)}>Check Out</Button>
              </>
            )}
            {confirming && (
              <div className="border rounded p-3">
                <div className="text-sm mb-2">Yakin ingin melanjutkan?</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>Batal</Button>
                  <Button onClick={submit} disabled={submitting}>{submitting ? 'Memproses...' : 'Ya, Lanjut'}</Button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Dialog.Close asChild>
            <Button variant="outline" onClick={onClose}>Tutup</Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}


