"use client";

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CalendarClient from '@/app/admin/calendar/CalendarClient'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { locationService } from '@/lib/location'

type WorkSettings = {
  id: number
  timezone: string
  start_time: string
  end_time: string
  required_minutes: number
  grace_minutes: number
  workdays: number[]
  friday_start_time: string
  friday_end_time: string
  friday_required_minutes: number
  friday_grace_minutes: number
  office_latitude?: number | null
  office_longitude?: number | null
  office_radius_meters?: number
  overtime_rate_workday: number | string
  overtime_rate_holiday: number | string
  overtime_threshold_minutes: number
  earliest_check_in_enabled?: boolean
  earliest_check_in_time?: string
  latest_check_out_enabled?: boolean
  latest_check_out_time?: string
}

type Holiday = { id: number; date: string; note?: string }
type PaginatedHolidays = { count: number; next: string | null; previous: string | null; results: Holiday[] }

const IANA_TIMEZONES = [
  'Asia/Dubai', 'UTC', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Riyadh', 'Europe/London'
]

export default function SettingsClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<WorkSettings | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [locating, setLocating] = useState(false)
  const [holidaysCount, setHolidaysCount] = useState(0)
  const [holidaysPage, setHolidaysPage] = useState(1)
  const [holidaysPageSize, setHolidaysPageSize] = useState(10)
  const [holidaysLoading, setHolidaysLoading] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)
  const [templateUploadMessage, setTemplateUploadMessage] = useState<string | null>(null)
  const [uploadingMonthlyExportTemplate, setUploadingMonthlyExportTemplate] = useState(false)
  const [monthlyExportTemplateMessage, setMonthlyExportTemplateMessage] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, h] = await Promise.all([
          fetch('/api/admin/settings/work').then(r => r.json()),
          fetch(`/api/admin/settings/holidays?page=${1}&page_size=${10}`).then(r => r.json()),
        ])
        
        // Check if work settings exist, if not create default settings
        let settingsData = s
        if (s.error || !s.id) {
          // No work settings exist, create default settings
          settingsData = {
            id: null,
            timezone: 'Asia/Dubai',
            start_time: '09:00:00',
            end_time: '17:00:00',
            required_minutes: 480,
            grace_minutes: 0,
            workdays: [0, 1, 2, 3, 4],
            friday_start_time: '09:00:00',
            friday_end_time: '13:00:00',
            friday_required_minutes: 240,
            friday_grace_minutes: 0,
            office_latitude: null,
            office_longitude: null,
            office_radius_meters: 100,
            overtime_rate_workday: '0.50',
            overtime_rate_holiday: '0.75',
            overtime_threshold_minutes: 60,
            earliest_check_in_enabled: false,
            earliest_check_in_time: '06:00:00',
            latest_check_out_enabled: false,
            latest_check_out_time: '22:00:00'
          }
        }
        
        // Set default values for new fields if they don't exist
        const settingsWithDefaults = {
          ...settingsData,
          earliest_check_in_enabled: settingsData.earliest_check_in_enabled ?? false,
          earliest_check_in_time: settingsData.earliest_check_in_time ?? '06:00',
          latest_check_out_enabled: settingsData.latest_check_out_enabled ?? false,
          latest_check_out_time: settingsData.latest_check_out_time ?? '22:00'
        }
        setSettings(settingsWithDefaults)
        setHolidays(h?.results ?? [])
        setHolidaysCount(h?.count ?? 0)
        setHolidaysPage(1)
        setHolidaysPageSize(10)
      } catch (_) {
        setError('Gagal memuat settings')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadHolidays(page: number, pageSize: number) {
    setHolidaysLoading(true)
    try {
      const resp = await fetch(`/api/admin/settings/holidays?page=${page}&page_size=${pageSize}`)
      const data: PaginatedHolidays = await resp.json().catch(() => ({ count: 0, next: null, previous: null, results: [] }))
      setHolidays(data.results)
      setHolidaysCount(data.count || 0)
      setHolidaysPage(page)
      setHolidaysPageSize(pageSize)
    } finally {
      setHolidaysLoading(false)
    }
  }

  const workdayFlags = useMemo(() => {
    const base = new Set(settings?.workdays ?? [])
    return [0,1,2,3,4,5,6].map(d => base.has(d))
  }, [settings?.workdays])

  async function saveSettings() {
    if (!settings) return
    setSaving(true)
    setError(null)
    try {
      const resp = await fetch('/api/admin/settings/work', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error((data as { detail?: string })?.detail || 'Gagal menyimpan settings')
      setSettings(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan settings')
    } finally {
      setSaving(false)
    }
  }

  async function useMyLocation() {
    if (!settings) return
    setError(null)
    setLocating(true)
    try {
      const loc = await locationService.getCurrentLocation({
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 30000,
      })
      setSettings({
        ...settings,
        office_latitude: Number(loc.lat.toFixed(7)),
        office_longitude: Number(loc.lng.toFixed(7)),
        office_radius_meters: settings.office_radius_meters ?? 100,
      })
    } catch (e: any) {
      // Fallback: try watchPosition briefly if position is unavailable (code 2)
      const code = typeof e?.code === 'number' ? e.code : undefined
      if (code === 2 && 'geolocation' in navigator) {
        try {
          const loc = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            const watchId = navigator.geolocation.watchPosition(
              (pos) => {
                navigator.geolocation.clearWatch(watchId)
                resolve({
                  lat: Number(pos.coords.latitude.toFixed(6)),
                  lng: Number(pos.coords.longitude.toFixed(6)),
                })
              },
              (err) => {
                navigator.geolocation.clearWatch(watchId)
                reject(err)
              },
              { enableHighAccuracy: true, maximumAge: 0 }
            )
            setTimeout(() => {
              navigator.geolocation.clearWatch(watchId)
              reject(new Error('Gagal mengambil lokasi (timeout)'))
            }, 20000)
          })
          setSettings({
            ...settings,
            office_latitude: Number(loc.lat.toFixed(7)),
            office_longitude: Number(loc.lng.toFixed(7)),
            office_radius_meters: settings.office_radius_meters ?? 100,
          })
          return
        } catch (_) {
          // fall through to show original error
        }
      }
      setError(e?.message || 'Gagal mengambil lokasi')
    } finally {
      setLocating(false)
    }
  }

  async function addHoliday(date: string, note: string) {
    setError(null)
    const resp = await fetch('/api/admin/settings/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, note }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      setError((data as { detail?: string })?.detail || 'Gagal menambah libur')
      return
    }
    // reload current page
    await loadHolidays(holidaysPage, holidaysPageSize)
  }

  async function deleteHoliday(id: number) {
    setError(null)
    const resp = await fetch(`/api/admin/settings/holidays/${id}`, { method: 'DELETE' })
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}))
      setError((data as { detail?: string })?.detail || 'Gagal menghapus libur')
      return
    }
    await loadHolidays(holidaysPage, holidaysPageSize)
  }

  async function uploadTemplate(file: File) {
    setUploadingTemplate(true)
    setTemplateUploadMessage(null)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('template', file)
      
      const resp = await fetch('/api/admin/settings/upload-template', {
        method: 'POST',
        body: formData,
      })
      
      const data = await resp.json()
      
      if (!resp.ok) {
        throw new Error(data.detail || 'Gagal upload template')
      }
      
      setTemplateUploadMessage('Template berhasil diupload! Silakan restart backend untuk menggunakan template baru.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal upload template')
    } finally {
      setUploadingTemplate(false)
    }
  }

  async function uploadMonthlyExportTemplate(file: File) {
    setUploadingMonthlyExportTemplate(true)
    setMonthlyExportTemplateMessage(null)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('template', file)
      
      const resp = await fetch('/api/overtime-requests/upload-monthly-export-template', {
        method: 'POST',
        body: formData,
      })
      
      const data = await resp.json()
      
      if (!resp.ok) {
        throw new Error(data.detail || 'Gagal upload template monthly export')
      }
      
      setMonthlyExportTemplateMessage('Template monthly export berhasil diupload! Template akan otomatis terdeteksi.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal upload template monthly export')
    } finally {
      setUploadingMonthlyExportTemplate(false)
    }
  }

  if (loading) {
    return <div className="text-gray-600">Memuat settings...</div>
  }
  if (!settings) {
    return <div className="text-red-600">Settings tidak tersedia</div>
  }

  return (
    <div className="grid gap-6">
      {error && <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Jam Kerja Global</CardTitle>
          <CardDescription>Timezone, jam kerja, durasi kerja, grace, dan hari kerja</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Timezone</Label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="h-10 border rounded px-2 text-sm w-full"
            >
              {IANA_TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Jam Masuk</Label>
              <Input type="time" value={settings.start_time} onChange={(e) => setSettings({ ...settings, start_time: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Jam Keluar</Label>
              <Input type="time" value={settings.end_time} onChange={(e) => setSettings({ ...settings, end_time: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Durasi Kerja (menit)</Label>
              <Input type="number" value={settings.required_minutes} onChange={(e) => setSettings({ ...settings, required_minutes: Number(e.target.value || 0) })} />
            </div>
          </div>

          {/* Overtime Settings */}
          <div className="border-t pt-4">
            <div className="text-lg font-semibold mb-4 text-green-600">Pengaturan Lembur</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Rate Lembur Hari Kerja (kali gaji per jam)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={String(settings.overtime_rate_workday || 0.50)}
                  onChange={(e) => setSettings({ ...settings, overtime_rate_workday: Number(e.target.value || 0) })}
                />
                <div className="text-xs text-gray-500">Contoh: 0.50 = 2/4 dari gaji per jam</div>
              </div>
              <div className="grid gap-2">
                <Label>Rate Lembur Hari Libur (kali gaji per jam)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={String(settings.overtime_rate_holiday || 0.75)}
                  onChange={(e) => setSettings({ ...settings, overtime_rate_holiday: Number(e.target.value || 0) })}
                />
                <div className="text-xs text-gray-500">Contoh: 0.75 = 3/4 dari gaji per jam</div>
              </div>
              <div className="grid gap-2">
                <Label>Batas Mulai Lembur (menit)</Label>
                <Input
                  type="number"
                  value={settings.overtime_threshold_minutes || 60}
                  onChange={(e) => setSettings({ ...settings, overtime_threshold_minutes: Number(e.target.value || 60) })}
                />
                <div className="text-xs text-gray-500">Lembur mulai dihitung setelah melebihi jam kerja + batas ini</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Contoh:</strong> Jam kerja 8 jam (480 menit) + batas lembur {settings.overtime_threshold_minutes || 60} menit = 
                Lembur mulai dihitung setelah bekerja lebih dari {Math.floor(((settings.required_minutes || 480) + (settings.overtime_threshold_minutes || 60)) / 60)} jam {((settings.required_minutes || 480) + (settings.overtime_threshold_minutes || 60)) % 60} menit
              </div>
            </div>
          </div>

          {/* Check-in Restrictions */}
          <div className="border-t pt-4">
            <div className="text-lg font-semibold mb-4 text-orange-600">Pembatasan Awal Jam Absensi</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="earliest_check_in_enabled"
                  checked={settings.earliest_check_in_enabled || false}
                  onChange={(e) => setSettings({ ...settings, earliest_check_in_enabled: e.target.checked })}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <Label htmlFor="earliest_check_in_enabled" className="text-sm font-medium">
                  Aktifkan pembatasan jam absensi
                </Label>
              </div>
              <div className="grid gap-2">
                <Label>Jam paling awal untuk absen</Label>
                <Input
                  type="time"
                  value={settings.earliest_check_in_time || '06:00'}
                  onChange={(e) => setSettings({ ...settings, earliest_check_in_time: e.target.value })}
                  disabled={!settings.earliest_check_in_enabled}
                />
                <div className="text-xs text-gray-500">
                  Employee tidak bisa absen sebelum jam ini
                </div>
              </div>
            </div>
            {settings.earliest_check_in_enabled && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-800">
                  <strong>Info:</strong> Pembatasan jam absensi aktif. Employee hanya bisa absen mulai jam {settings.earliest_check_in_time || '06:00'}
                </div>
              </div>
            )}
          </div>

          {/* Check-out Restrictions */}
          <div className="border-t pt-4">
            <div className="text-lg font-semibold mb-4 text-red-600">Pembatasan Akhir Jam Check-out</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="latest_check_out_enabled"
                  checked={settings.latest_check_out_enabled || false}
                  onChange={(e) => setSettings({ ...settings, latest_check_out_enabled: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <Label htmlFor="latest_check_out_enabled" className="text-sm font-medium">
                  Aktifkan pembatasan jam check-out
                </Label>
              </div>
              <div className="grid gap-2">
                <Label>Jam paling akhir untuk check-out</Label>
                <Input
                  type="time"
                  value={settings.latest_check_out_time || '22:00'}
                  onChange={(e) => setSettings({ ...settings, latest_check_out_time: e.target.value })}
                  disabled={!settings.latest_check_out_enabled}
                />
                <div className="text-xs text-gray-500">
                  Employee tidak bisa check-out setelah jam ini
                </div>
              </div>
            </div>
            {settings.latest_check_out_enabled && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-800">
                  <strong>Info:</strong> Pembatasan jam check-out aktif. Employee hanya bisa check-out sampai jam {settings.latest_check_out_time || '22:00'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Latitude Kantor</Label>
              <Input
                placeholder="-6.2"
                value={settings.office_latitude ?? ''}
                onChange={(e) => setSettings({ ...settings, office_latitude: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Longitude Kantor</Label>
              <Input
                placeholder="106.8"
                value={settings.office_longitude ?? ''}
                onChange={(e) => setSettings({ ...settings, office_longitude: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Radius Geofence (meter)</Label>
              <Input
                type="number"
                value={settings.office_radius_meters ?? 100}
                onChange={(e) => setSettings({ ...settings, office_radius_meters: Number(e.target.value || 0) })}
              />
            </div>
          </div>
          <div>
            <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
              {locating ? 'Mengambil lokasi...' : 'Gunakan Lokasi Saya'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Grace (menit)</Label>
              <Input type="number" value={settings.grace_minutes} onChange={(e) => setSettings({ ...settings, grace_minutes: Number(e.target.value || 0) })} />
            </div>
            <div className="grid gap-2">
              <Label>Hari Kerja</Label>
              <div className="flex flex-wrap gap-2">
                {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((label, idx) => (
                  <button
                    key={idx}
                    className={`px-3 py-1 border rounded text-sm ${workdayFlags[idx] ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}
                    onClick={(e) => { e.preventDefault(); const set = new Set(settings.workdays); if (set.has(idx)) set.delete(idx); else set.add(idx); setSettings({ ...settings, workdays: Array.from(set).sort() as number[] }) }}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Friday-specific settings */}
          <div className="border-t pt-4">
            <div className="text-lg font-semibold mb-4 text-blue-600">Pengaturan Khusus Hari Jumat</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Jam Masuk Jumat</Label>
                <Input type="time" value={settings.friday_start_time} onChange={(e) => setSettings({ ...settings, friday_start_time: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Jam Keluar Jumat</Label>
                <Input type="time" value={settings.friday_end_time} onChange={(e) => setSettings({ ...settings, friday_end_time: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Durasi Kerja Jumat (menit)</Label>
                <Input type="number" value={settings.friday_required_minutes} onChange={(e) => setSettings({ ...settings, friday_required_minutes: Number(e.target.value || 0) })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="grid gap-2">
                <Label>Grace Jumat (menit)</Label>
                <Input type="number" value={settings.friday_grace_minutes} onChange={(e) => setSettings({ ...settings, friday_grace_minutes: Number(e.target.value || 0) })} />
              </div>
              <div className="grid gap-2">
                <Label className="text-sm text-gray-600">Info</Label>
                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                  Hari Jumat menggunakan jam kerja khusus: {settings.friday_start_time} - {settings.friday_end_time} 
                  ({Math.floor(settings.friday_required_minutes / 60)} jam {settings.friday_required_minutes % 60} menit)
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hari Libur</CardTitle>
          <CardDescription>Tambahkan atau hapus tanggal libur</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <AddHolidayForm onAdd={addHoliday} />
          <HolidaysTable
            data={holidays}
            loading={holidaysLoading}
            page={holidaysPage}
            pageSize={holidaysPageSize}
            total={holidaysCount}
            onDelete={deleteHoliday}
            onPageChange={(p) => loadHolidays(p, holidaysPageSize)}
            onPageSizeChange={(ps) => loadHolidays(1, ps)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <div className="text-lg font-semibold">Kalender Hari Libur</div>
        <CalendarClient />
      </div>

      {/* Template Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle>📄 Dokumentasi Template Dokumen Overtime</CardTitle>
          <CardDescription>Informasi tentang placeholder yang tersedia untuk template dokumen overtime</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4">
            {templateUploadMessage && (
              <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded">
                {templateUploadMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-4">
              <Button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/api/overtime-requests/preview-template';
                  link.download = 'Preview_Template_Overtime.docx';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                📥 Download Preview Template
              </Button>
              <div className="text-sm text-gray-600">
                Download template dengan data sample untuk melihat contoh hasil akhir. Template akan otomatis terdeteksi.
              </div>
            </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadTemplate(file);
                      }
                    }}
                    className="hidden"
                    id="template-upload"
                    disabled={uploadingTemplate}
                  />
                  <label
                    htmlFor="template-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-md transition-colors ${
                      uploadingTemplate 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {uploadingTemplate ? '⏳ Uploading...' : '📤 Upload Template Baru'}
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  Upload template Word (.docx) baru untuk menggantikan template yang ada. Template akan otomatis terdeteksi berdasarkan file terbaru.
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/overtime-requests/reload-template', {
                          method: 'POST',
                        });
                        const data = await response.json();
                        if (response.ok) {
                          alert(`Template cache berhasil di-clear. Template aktif: ${data.current_template}`);
                        } else {
                          alert(`Error: ${data.detail}`);
                        }
                      } catch (_) {
                        alert('Gagal reload template');
                      }
                    }}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                  >
                    🔄 Reload Template Cache
                  </button>
                  <span className="text-xs text-gray-500">
                    Gunakan jika template tidak otomatis terdeteksi
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 Placeholder yang Tersedia</h3>
              
              <div className="grid gap-4">
                {/* Document Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">📄 Informasi Dokumen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NOMOR_DOKUMEN}}"}</code> → Nomor dokumen (format: ID/SPKL/KJRI-DXB/TAHUN)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TANGGAL_DOKUMEN}}"}</code> → Tanggal dokumen (format Indonesia)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TAHUN}}"}</code> → Tahun saat ini</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{BULAN}}"}</code> → Bulan saat ini (format Indonesia)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{HARI}}"}</code> → Hari saat ini</div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">👤 Informasi Pegawai</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NAMA_PEGAWAI}}"}</code> → Nama lengkap pegawai</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP_PEGAWAI}}"}</code> → NIP pegawai (format asli)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP}}"}</code> → NIP pegawai (alias untuk {"{{NIP_PEGAWAI}}"})</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP_LENGKAP}}"}</code> → NIP 18 digit (dipadankan dengan 0)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP_18_DIGIT}}"}</code> → NIP 18 digit (format standar PNS)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP_9_DIGIT}}"}</code> → NIP 9 digit pertama</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{JABATAN_PEGAWAI}}"}</code> → Jabatan pegawai</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{DIVISI_PEGAWAI}}"}</code> → Divisi pegawai</div>
                  </div>
                </div>

                {/* Overtime Details */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">⏰ Detail Lembur</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TANGGAL_LEMBUR}}"}</code> → Tanggal lembur (format Indonesia)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{JAM_LEMBUR}}"}</code> → Jumlah jam lembur</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{DESKRIPSI_PEKERJAAN}}"}</code> → Deskripsi pekerjaan lembur</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{JUMLAH_GAJI_LEMBUR}}"}</code> → Jumlah gaji lembur</div>
                  </div>
                </div>

                {/* Overtime Table */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">📊 Tabel Overtime</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TABEL_OVERTIME}}"}</code> → Tabel lengkap daftar overtime dengan styling profesional</div>
                    <div className="text-xs text-orange-600 mt-1">• Kolom: No, Tanggal, Jam Lembur, Deskripsi, Status, Gaji Lembur</div>
                    <div className="text-xs text-orange-600">• Styling: Borders, alignment, alternating colors</div>
                    <div className="text-xs text-orange-600">• Summary: Total jam dan gaji di baris terakhir</div>
                  </div>
                </div>

                {/* Approval Info */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">✅ Informasi Approval</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LEVEL1_APPROVER}}"}</code> → Nama supervisor level 1</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LEVEL1_APPROVER_NIP}}"}</code> → NIP supervisor level 1</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LEVEL1_APPROVAL_DATE}}"}</code> → Tanggal approval level 1</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{FINAL_APPROVER}}"}</code> → Nama supervisor final</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{FINAL_APPROVER_NIP}}"}</code> → NIP supervisor final</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{FINAL_APPROVAL_DATE}}"}</code> → Tanggal approval final</div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">🏢 Informasi Perusahaan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NAMA_PERUSAHAAN}}"}</code> → KJRI DUBAI</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{ALAMAT_PERUSAHAAN}}"}</code> → KONSULAT JENDERAL REPUBLIK INDONESIA DI DUBAI</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LOKASI}}"}</code> → Dubai</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📝 Cara Penggunaan</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                <div>1. <strong>Download Preview Template</strong> untuk melihat contoh hasil akhir</div>
                <div>2. <strong>Edit template Word</strong> dengan menambahkan placeholder yang diinginkan</div>
                <div>3. <strong>Upload template baru</strong> ke folder <code className="bg-white px-1 rounded">template/</code></div>
                <div>4. <strong>Update path template</strong> di backend jika menggunakan nama file berbeda</div>
                <div>5. <strong>Test fitur download</strong> dengan overtime yang sudah approved</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">⚠️ Catatan Penting</h3>
              <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 space-y-2">
                <div>• Template harus dalam format <strong>.docx</strong> (Word Document)</div>
                <div>• Placeholder harus menggunakan format <code className="bg-white px-1 rounded">{"{{NAMA_PLACEHOLDER}}"}</code></div>
                <div>• Hanya overtime dengan status <strong>&quot;approved&quot;</strong> yang bisa didownload</div>
                <div>• Template akan otomatis diisi dengan data dari database overtime</div>
                <div>• Jika placeholder tidak ditemukan, akan tetap ditampilkan apa adanya</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Export Overtime Template Section */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Template Export Overtime Bulanan</CardTitle>
          <CardDescription>Upload dan kelola template untuk export data overtime bulanan dengan tabel dinamis</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4">
            {monthlyExportTemplateMessage && (
              <div className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded">
                {monthlyExportTemplateMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/template/template_monthly_overtime_export.docx';
                    link.download = 'template_monthly_overtime_export.docx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  📥 Download Template Sample
                </Button>
                <div className="text-sm text-gray-600">
                  Download template sample untuk export overtime bulanan. Template ini sudah dilengkapi dengan placeholder yang diperlukan.
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadMonthlyExportTemplate(file);
                      }
                    }}
                    className="hidden"
                    id="monthly-export-template-upload"
                    disabled={uploadingMonthlyExportTemplate}
                  />
                  <label
                    htmlFor="monthly-export-template-upload"
                    className={`cursor-pointer inline-flex items-center px-4 py-2 rounded-md transition-colors ${
                      uploadingMonthlyExportTemplate 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {uploadingMonthlyExportTemplate ? '⏳ Uploading...' : '📤 Upload Template Export Bulanan'}
                  </label>
                </div>
                <div className="text-sm text-gray-600">
                  Upload template Word (.docx) baru untuk export overtime bulanan. Template akan otomatis terdeteksi berdasarkan priority system.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/overtime-requests/reload-monthly-export-template', {
                      method: 'POST',
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert(`Template monthly export cache berhasil di-clear. Template aktif: ${data.current_template}`);
                    } else {
                      alert(`Error: ${data.detail}`);
                    }
                  } catch (_) {
                    alert('Gagal reload template monthly export');
                  }
                }}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
              >
                🔄 Reload Template Cache
              </button>
              <span className="text-xs text-gray-500">
                Gunakan jika template tidak otomatis terdeteksi
              </span>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📋 Placeholder untuk Export Bulanan</h3>
              
              <div className="grid gap-4">
                {/* Header & Metadata */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">📄 Header & Metadata</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{PERIODE_EXPORT}}"}</code> → Periode export (Januari 2024)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TANGGAL_EXPORT}}"}</code> → Tanggal export (15 Januari 2024)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NOMOR_EXPORT}}"}</code> → Nomor export (EXP-202401/2025)</div>
                  </div>
                </div>

                {/* Employee Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">👤 Informasi Pegawai</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NAMA_PEGAWAI}}"}</code> → Nama lengkap pegawai</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NIP_PEGAWAI}}"}</code> → NIP pegawai</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{DIVISI_PEGAWAI}}"}</code> → Divisi pegawai</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{JABATAN_PEGAWAI}}"}</code> → Jabatan pegawai</div>
                  </div>
                </div>

                {/* Summary Data */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">📊 Ringkasan Bulanan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TOTAL_HARI_LEMBUR}}"}</code> → Total hari lembur (5 hari)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TOTAL_JAM_LEMBUR}}"}</code> → Total jam lembur (24.5 jam)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TOTAL_GAJI_LEMBUR}}"}</code> → Total gaji lembur (Rp 1,250,000)</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{RATA_RATA_PER_HARI}}"}</code> → Rata-rata jam per hari (4.9 jam)</div>
                  </div>
                </div>

                {/* Overtime Table */}
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">📊 Tabel Detail Overtime</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TABEL_OVERTIME}}"}</code> → Tabel lengkap daftar overtime bulanan</div>
                    <div className="text-xs text-orange-600 mt-1">• Kolom: Tanggal, Jam Lembur, Deskripsi, Status, Gaji Lembur</div>
                    <div className="text-xs text-orange-600">• Data: Semua overtime request dalam periode yang dipilih</div>
                    <div className="text-xs text-orange-600">• Styling: Professional borders, alternating row colors</div>
                  </div>
                </div>

                {/* Approval Information */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">✅ Informasi Approval</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LEVEL1_APPROVER}}"}</code> → Nama supervisor divisi</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{FINAL_APPROVER}}"}</code> → Nama supervisor organisasi</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{TANGGAL_APPROVAL}}"}</code> → Tanggal approval</div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">🏢 Informasi Perusahaan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div><code className="bg-white px-2 py-1 rounded">{"{{NAMA_PERUSAHAAN}}"}</code> → KJRI DUBAI</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{ALAMAT_PERUSAHAAN}}"}</code> → KONSULAT JENDERAL REPUBLIK INDONESIA DI DUBAI</div>
                    <div><code className="bg-white px-2 py-1 rounded">{"{{LOKASI}}"}</code> → Dubai</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📊 Tabel Dinamis</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                <div>• <strong>Tabel overtime otomatis</strong> akan di-generate oleh sistem</div>
                <div>• <strong>Kolom tabel</strong>: Tanggal, Jam Lembur, Deskripsi, Status, Gaji Lembur</div>
                <div>• <strong>Styling profesional</strong> dengan borders, alignment, dan formatting</div>
                <div>• <strong>Summary row</strong> dengan total jam dan gaji</div>
                <div>• <strong>Data real-time</strong> dari database overtime</div>
                <div>• <strong>Placeholder khusus</strong>: <code className="bg-white px-1 rounded">{"{{TABEL_OVERTIME}}"}</code> untuk menempatkan tabel di posisi tertentu</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">📝 Cara Penggunaan</h3>
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-2">
                <div>1. <strong>Download Template Sample</strong> untuk melihat struktur yang direkomendasikan</div>
                <div>2. <strong>Edit template Word</strong> dengan menambahkan placeholder yang diinginkan</div>
                <div>3. <strong>Upload template baru</strong> menggunakan form di atas</div>
                <div>4. <strong>Template akan otomatis terdeteksi</strong> berdasarkan priority system</div>
                <div>5. <strong>Test fitur export</strong> dengan data overtime bulanan</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">🎯 Template Priority System</h3>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 space-y-2">
                <div>1. <strong>template_monthly_overtime_export.docx</strong> (Primary - Prioritas Tertinggi)</div>
                <div>2. <strong>template_monthly_overtime.docx</strong> (Fallback 1)</div>
                <div>3. <strong>template_monthly_export.docx</strong> (Fallback 2)</div>
                <div>4. <strong>template_overtime_monthly.docx</strong> (Fallback 3)</div>
                <div>5. <strong>Regular overtime template</strong> (Final fallback)</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">⚠️ Catatan Penting</h3>
              <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800 space-y-2">
                <div>• Template harus dalam format <strong>.docx</strong> (Word Document)</div>
                <div>• Placeholder harus menggunakan format <code className="bg-white px-1 rounded">{"{{NAMA_PLACEHOLDER}}"}</code></div>
                <div>• <strong>Tabel akan di-generate otomatis</strong> oleh sistem</div>
                <div>• <strong>Data real-time</strong> dari database overtime</div>
                <div>• <strong>Template caching</strong> untuk performance optimal</div>
                <div>• <strong>Fallback system</strong> memastikan export selalu berhasil</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AddHolidayForm({ onAdd }: { onAdd: (date: string, note: string) => void }) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  return (
    <form className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end" onSubmit={(e) => { e.preventDefault(); if (!date) return; onAdd(date, note); setDate(''); setNote('') }}>
      <div className="grid gap-1">
        <Label>Tanggal</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label>Catatan</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
      </div>
      <div>
        <Button type="submit">Tambah</Button>
      </div>
    </form>
  )
}

function HolidaysTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onDelete,
  onPageChange,
  onPageSizeChange,
}: {
  data: Holiday[]
  loading: boolean
  page: number
  pageSize: number
  total: number
  onDelete: (id: number) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (ps: number) => void
}) {
  const columns = useMemo<ColumnDef<Holiday>[]>(() => [
    { header: 'Tanggal', accessorKey: 'date', cell: ({ getValue }) => <span className="text-sm">{String(getValue<string>())}</span> },
    { header: 'Catatan', accessorKey: 'note', cell: ({ getValue }) => <span className="text-sm">{String(getValue<string>() || '-')}</span> },
    {
      header: 'Aksi',
      id: 'actions',
      cell: ({ row }) => (
        <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => onDelete(row.original.id)}>Hapus</Button>
      ),
    },
  ], [onDelete])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left text-xs text-gray-600 px-3 py-2">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">Memuat...</td></tr>
            ) : (
              table.getRowModel().rows.map(r => (
                <tr key={r.id} className="border-t">
                  {r.getVisibleCells().map(c => (
                    <td key={c.id} className="px-3 py-2">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">Belum ada data libur</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Total: {total} • Page {page} of {totalPages}</div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 border rounded px-2 text-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value || 10))}
          >
            {[10, 20, 50].map(ps => <option key={ps} value={ps}>{ps} / page</option>)}
          </select>
          <Button variant="outline" onClick={() => onPageChange(prevPage)} disabled={page <= 1}>Prev</Button>
          <Button variant="outline" onClick={() => onPageChange(nextPage)} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  )
}



