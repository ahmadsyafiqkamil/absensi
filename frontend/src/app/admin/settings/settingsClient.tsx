"use client";

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CalendarClient from '@/app/admin/calendar/CalendarClient'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

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

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [s, h] = await Promise.all([
          fetch('/api/admin/settings/work').then(r => r.json()),
          fetch(`/api/admin/settings/holidays?page=${1}&page_size=${10}`).then(r => r.json()),
        ])
        setSettings(s)
        setHolidays(h?.results ?? [])
        setHolidaysCount(h?.count ?? 0)
        setHolidaysPage(1)
        setHolidaysPageSize(10)
      } catch (e) {
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
      if (!resp.ok) throw new Error((data as any)?.detail || 'Gagal menyimpan settings')
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
      await new Promise<void>((resolve, reject) => {
        if (!('geolocation' in navigator)) {
          reject(new Error('Geolocation tidak didukung browser'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, accuracy } = pos.coords
            setSettings({
              ...settings,
              office_latitude: Number(latitude.toFixed(7)),
              office_longitude: Number(longitude.toFixed(7)),
              office_radius_meters: settings.office_radius_meters ?? 100,
            })
            resolve()
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        )
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil lokasi')
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
      setError((data as any)?.detail || 'Gagal menambah libur')
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
      setError((data as any)?.detail || 'Gagal menghapus libur')
      return
    }
    await loadHolidays(holidaysPage, holidaysPageSize)
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



