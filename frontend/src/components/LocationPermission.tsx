"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { locationService } from '@/lib/location'

interface LocationPermissionProps {
  onPermissionGranted: () => void
  onPermissionDenied: () => void
}

export function LocationPermission({ onPermissionGranted, onPermissionDenied }: LocationPermissionProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkPermission()
  }, [])

  async function checkPermission() {
    try {
      setIsChecking(true)
      setError(null)
      const permission = await locationService.checkPermission()
      setPermissionState(permission)
      
      if (permission === 'granted') {
        onPermissionGranted()
      } else if (permission === 'denied') {
        onPermissionDenied()
      }
    } catch (error) {
      setError('Gagal memeriksa izin lokasi')
      console.error('Permission check error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  async function requestPermission() {
    try {
      setError(null)
      const granted = await locationService.requestPermission()
      if (granted) {
        setPermissionState('granted')
        onPermissionGranted()
      } else {
        setPermissionState('denied')
        onPermissionDenied()
      }
    } catch (error) {
      setError('Gagal meminta izin lokasi')
      console.error('Permission request error:', error)
    }
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Memeriksa izin lokasi...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (permissionState === 'granted') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <AlertDescription className="text-green-800">
          ✅ Izin lokasi sudah diberikan. Anda dapat menggunakan fitur check-in/check-out.
        </AlertDescription>
      </Alert>
    )
  }

  if (permissionState === 'denied') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">❌ Izin Lokasi Ditolak</CardTitle>
          <CardDescription className="text-red-700">
            Browser tidak dapat mengakses lokasi Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-red-700">
            <p><strong>Solusi:</strong></p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Klik icon <strong>🔒</strong> di address bar</li>
              <li>Pilih <strong>"Allow"</strong> untuk lokasi</li>
              <li>Refresh halaman</li>
            </ol>
          </div>
          <Button 
            variant="outline" 
            onClick={checkPermission}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Cek Lagi
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">📍 Izin Lokasi Diperlukan</CardTitle>
        <CardDescription className="text-yellow-700">
          Fitur check-in/check-out memerlukan akses lokasi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-yellow-700">
          <p>Untuk menggunakan fitur check-in/check-out, Anda perlu:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Mengizinkan akses lokasi di browser</li>
            <li>Memastikan GPS aktif di device</li>
            <li>Menggunakan HTTPS (https://absensi.localhost)</li>
          </ul>
        </div>
        <Button 
          onClick={requestPermission}
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          Izinkan Lokasi
        </Button>
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
