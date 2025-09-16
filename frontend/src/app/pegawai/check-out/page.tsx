"use client";

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { locationService, LocationData, LocationError } from '@/lib/location'

type Precheck = { 
  date_local: string; 
  has_check_in: boolean; 
  has_check_out: boolean;
  time_restrictions?: {
    earliest_check_in_enabled: boolean;
    earliest_check_in_time: string;
    latest_check_out_enabled: boolean;
    latest_check_out_time: string;
  };
}

export default function CheckOutPage() {
  const [loading, setLoading] = useState(true)
  const [precheck, setPrecheck] = useState<Precheck | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loc, setLoc] = useState<LocationData | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientIP, setClientIP] = useState<string>('')
  const [ipDetectionStatus, setIpDetectionStatus] = useState<'detecting' | 'success' | 'failed' | 'unknown'>('detecting')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [timeRestrictionError, setTimeRestrictionError] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/v2/attendance/precheck', { method: 'GET' })
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d?.detail || 'Gagal precheck')
        setPrecheck(d)
        
        // Update current time
        const now = new Date()
        const timeString = now.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Dubai'
        })
        setCurrentTime(timeString)
        
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

  function isCheckOutAllowed(): { allowed: boolean; message?: string } {
    if (!precheck?.time_restrictions?.latest_check_out_enabled) {
      return { allowed: true }
    }
    
    const now = new Date()
    const currentTime = now.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Dubai'
    })
    
    const latestTime = precheck.time_restrictions.latest_check_out_time
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
    const latestTimeMinutes = parseInt(latestTime.split(':')[0]) * 60 + parseInt(latestTime.split(':')[1])
    
    if (currentTimeMinutes > latestTimeMinutes) {
      return { 
        allowed: false, 
        message: `Check-out tidak diizinkan setelah jam ${latestTime}. Waktu saat ini: ${currentTime}. Silakan hubungi admin untuk bantuan.` 
      }
    }
    
    return { allowed: true }
  }

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

  async function onConfirmCheckOut() {
    if (!loc) return
    setSubmitting(true)
    setError(null)
    try {
      const resp = await fetch('/api/v2/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          latitude: loc.lat, 
          longitude: loc.lng, 
          accuracy: loc.acc, 
          note: note || undefined,
          ip_address: clientIP || 'unknown'
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data?.detail || 'Gagal check-out')
      window.location.href = '/pegawai'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal check-out')
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
          <CardTitle>Check Out</CardTitle>
          <CardDescription>Tanggal: {precheck?.date_local ?? '-'}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">{error}</div>}
          {timeRestrictionError && (
            <div className="bg-red-100 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-600 text-lg">🚫</span>
                <div>
                  <strong>Check-out Tidak Diizinkan!</strong>
                  <div className="text-sm mt-1">{timeRestrictionError}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Time restrictions info */}
          {precheck?.time_restrictions?.latest_check_out_enabled && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
              <div className="flex items-center gap-2">
                <span className="text-red-600">🚫</span>
                <div>
                  <strong>Pembatasan Waktu:</strong> Check-out hanya diizinkan sampai jam {precheck.time_restrictions.latest_check_out_time}
                  <div className="text-xs mt-1">Waktu saat ini: {currentTime}</div>
                </div>
              </div>
            </div>
          )}
          
          {!precheck?.has_check_in ? (
            <div className="text-sm text-gray-600">Anda belum check-in hari ini.</div>
          ) : precheck?.has_check_out ? (
            <div className="text-sm text-gray-600">Anda sudah check-out hari ini.</div>
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
                <textarea className="border rounded p-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alasan kurang jam kerja (jika kurang)"></textarea>
              </div>
              <Button 
                disabled={!loc} 
                onClick={() => {
                  const timeCheck = isCheckOutAllowed()
                  if (!timeCheck.allowed) {
                    setTimeRestrictionError(timeCheck.message || 'Check-out tidak diizinkan saat ini')
                    setError('')
                    return
                  }
                  setTimeRestrictionError('')
                  setConfirming(true)
                }}
              >
                Konfirmasi Check Out
              </Button>
              {confirming && (
                <div className="border rounded p-3">
                  <div className="text-sm mb-2">Yakin ingin check-out dengan lokasi saat ini?</div>
                  <div className="text-xs text-gray-500 mb-2">Waktu saat ini: {currentTime}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>Batal</Button>
                    <Button onClick={onConfirmCheckOut} disabled={submitting}>{submitting ? 'Memproses...' : 'Ya, Check Out'}</Button>
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


