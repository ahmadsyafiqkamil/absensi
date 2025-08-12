"use client";

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useParams, useRouter } from 'next/navigation'

type Division = { id: number; name: string }
type Position = { id: number; name: string }

export default function EditEmployeePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [divisions, setDivisions] = useState<Division[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  const [formData, setFormData] = useState({
    nip: '',
    division_id: '',
    position_id: '',
    gaji_pokok: '',
    tmt_kerja: '',
    tempat_lahir: '',
    tanggal_lahir: '',
  })

  useEffect(() => {
    let mounted = true
    async function loadLookups() {
      const [d, p] = await Promise.all([
        fetch('/api/admin/divisions').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/positions').then(r => r.json()).catch(() => ({})),
      ])
      const dd = Array.isArray(d) ? d : (d?.results ?? [])
      const pp = Array.isArray(p) ? p : (p?.results ?? [])
      if (mounted) {
        setDivisions(dd)
        setPositions(pp)
      }
    }
    async function loadEmployee() {
      try {
        const resp = await fetch(`/api/admin/employees/${id}`)
        const data = await resp.json().catch(() => ({}))
        if (!resp.ok) throw new Error(data.detail || 'Failed to load employee')
        if (mounted) {
          setFormData({
            nip: data.nip || '',
            division_id: data.division?.id?.toString?.() ?? '',
            position_id: data.position?.id?.toString?.() ?? '',
            gaji_pokok: data.gaji_pokok?.toString?.() ?? '',
            tmt_kerja: data.tmt_kerja || '',
            tempat_lahir: data.tempat_lahir || '',
            tanggal_lahir: data.tanggal_lahir || '',
          })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (id) {
      loadLookups()
      loadEmployee()
    }
    return () => { mounted = false }
  }, [id])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload: any = {
        nip: formData.nip,
        division_id: formData.division_id || null,
        position_id: formData.position_id || null,
        gaji_pokok: formData.gaji_pokok ? formData.gaji_pokok : null,
        tmt_kerja: formData.tmt_kerja || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
      }
      const resp = await fetch(`/api/admin/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(data.detail || 'Failed to update employee')
      setSuccess('Employee updated successfully')
      setTimeout(() => router.push('/admin/employees'), 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Edit Employee" subtitle={`ID: ${id || '-'}`} username="Admin" role="admin" />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Employee</CardTitle>
            <CardDescription>Update employee details</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nip">NIP</Label>
                  <Input id="nip" name="nip" value={formData.nip} onChange={handleInputChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="division_id">Division</Label>
                    <Select id="division_id" name="division_id" value={formData.division_id} onChange={handleInputChange}>
                      <option value="">Select Division</option>
                      {divisions.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position_id">Position</Label>
                    <Select id="position_id" name="position_id" value={formData.position_id} onChange={handleInputChange}>
                      <option value="">Select Position</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gaji_pokok">Gaji Pokok</Label>
                    <Input id="gaji_pokok" name="gaji_pokok" type="number" step="0.01" value={formData.gaji_pokok} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tmt_kerja">TMT Kerja</Label>
                    <Input id="tmt_kerja" name="tmt_kerja" type="date" value={formData.tmt_kerja} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                    <Input id="tempat_lahir" name="tempat_lahir" value={formData.tempat_lahir} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                    <Input id="tanggal_lahir" name="tanggal_lahir" type="date" value={formData.tanggal_lahir} onChange={handleInputChange} />
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


