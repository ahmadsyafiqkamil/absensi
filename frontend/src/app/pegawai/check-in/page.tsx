"use client";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { locationService, LocationData, LocationError } from '@/lib/location'

type Precheck = { date_local: string; has_check_in: boolean; has_check_out: boolean }

export default function CheckInPage() {
  const [loading, setLoading] = useState(true)
  const [precheck, setPrecheck] = useState<Precheck | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loc, setLoc] = useState<LocationData | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientIP, setClientIP] = useState<string>('')
  const [ipDetectionStatus, setIpDetectionStatus] = useState<'detecting' | 'success' | 'failed' | 'unknown'>('detecting')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/v2/attendance/precheck', { method: 'GET' })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d?.detail || 'Gagal precheck')
        setPrecheck(d)
        
        // Get client IP address
        try {
          setIpDetectionStatus('detecting')
          const ipResponse = await fetch('/api/ip')
          const ipData = await ipResponse.json()
          console.log('IP Detection Result:', ipData)
          
          if (ipData.ip && ipData.ip !== 'unknown' && ipData.ip !== 'invalid-format' && ipData.ip !== 'error') {
            setClientIP(ipData.ip)
            setIpDetectionStatus('success')
          } else {
            setClientIP('Development Mode')
            setIpDetectionStatus('failed')
          }
        } catch (e) {
          console.warn('Failed to get IP address:', e)
          setClientIP('Development Mode')
          setIpDetectionStatus('failed')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gagal precheck')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function getLocation() {
    setError(null)
    try {
      // Check permission first
      const permission = await locationService.checkPermission()
      if (permission === 'denied') {
        setError('Izin lokasi ditolak. Silakan izinkan akses lokasi di browser.')
        return
      }

      // Get location using improved service
      const location = await locationService.getCurrentLocation()
      setLoc(location)
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message)
      } else if (typeof e === 'object' && e !== null && 'message' in e) {
        setError((e as any).message)
      } else {
        setError('Gagal mengambil lokasi')
      }
    }
  }

  async function onConfirmCheckIn() {
    if (!loc) return
    setSubmitting(true)
    setError(null)
    try {
      const resp = await fetch('/api/v2/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lat: loc.lat, 
          lng: loc.lng, 
          accuracy_m: loc.acc, 
          employee_note: note || undefined,
          client_ip: clientIP || 'unknown'
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.detail || 'Gagal check-in')
      window.location.href = '/pegawai'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal check-in')
    } finally {
      setSubmitting(false)
      setConfirming(false)
    }
  }

  if (loading) return <div className="min-h-screen grid place-items-center">Memuat...</div>

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check In</CardTitle>
          <CardDescription>Tanggal: {precheck?.date_local ?? '-'}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>}
          {precheck?.has_check_in ? (
            <div className="text-sm text-gray-600">Anda sudah check-in hari ini.</div>
          ) : (
            <>
              <div className="text-sm text-gray-700">Pertama, ambil lokasi Anda.</div>
              <Button variant="outline" onClick={getLocation}>Ambil Lokasi</Button>
              {loc && (
                <div className="text-xs text-gray-600">Lokasi: {loc.lat}, {loc.lng} (±{loc.acc}m)</div>
              )}
              {clientIP && (
                <div className="text-xs text-gray-600">
                  IP Address: {clientIP}
                  {ipDetectionStatus === 'detecting' && <span className="ml-2 text-blue-500">(Detecting...)</span>}
                  {ipDetectionStatus === 'success' && <span className="ml-2 text-green-500">✓</span>}
                  {ipDetectionStatus === 'failed' && <span className="ml-2 text-orange-500">(Dev Mode)</span>}
                </div>
              )}
              <div className="grid gap-2">
                <span className="text-xs text-gray-600">Keterangan (opsional)</span>
                <textarea className="border rounded p-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan keterlambatan (jika terlambat)"></textarea>
              </div>
              <Button disabled={!loc} onClick={() => setConfirming(true)}>Konfirmasi Check In</Button>
              {confirming && (
                <div className="border rounded p-3">
                  <div className="text-sm mb-2">Yakin ingin check-in dengan lokasi saat ini?</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>Batal</Button>
                    <Button onClick={onConfirmCheckIn} disabled={submitting}>{submitting ? 'Memproses...' : 'Ya, Check In'}</Button>
                  </div>
                </div>
              )}
            </>
          )}
          <Link href="/pegawai" className="text-blue-600 text-sm">Kembali</Link>
        </CardContent>
      </Card>
    </div>
  )
}


