"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { notificationApi } from '@/lib/api/notifications/client'
import type { NotificationFormData, NotificationTargets } from '@/lib/types/notifications'

// Form validation schema
const notificationFormSchema = z.object({
  title: z.string().min(1, 'Judul harus diisi').max(200, 'Judul maksimal 200 karakter'),
  content: z.string().min(1, 'Konten harus diisi').max(2000, 'Konten maksimal 2000 karakter'),
  notification_type: z.enum(['announcement', 'system_alert', 'attendance_reminder', 'policy_update', 'maintenance', 'division_notice', 'organization_wide']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  expiry_mode: z.enum(['manual', 'time_based', 'read_based', 'hybrid']),
  expire_after_hours: z.number().min(1, 'Minimal 1 jam').max(8760, 'Maksimal 1 tahun (8760 jam)'),
  expire_when_all_read: z.boolean(),
  target_groups_ids: z.array(z.number()).min(1, 'Pilih minimal 1 target'),
  target_divisions_ids: z.array(z.number()),
  target_positions_ids: z.array(z.number()),
  target_specific_users_ids: z.array(z.number()),
  publish_at: z.string().optional(),
  is_sticky: z.boolean(),
  requires_acknowledgment: z.boolean(),
})

type NotificationFormValues = z.infer<typeof notificationFormSchema>

interface CreateNotificationFormProps {
  onSuccess?: (notification: any) => void
  onCancel?: () => void
  initialData?: Partial<NotificationFormData>
}

export default function CreateNotificationForm({ 
  onSuccess, 
  onCancel,
  initialData 
}: CreateNotificationFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [targets, setTargets] = useState<NotificationTargets | null>(null)
  const [selectedTargets, setSelectedTargets] = useState({
    groups: [] as number[],
    divisions: [] as number[],
    positions: [] as number[],
    users: [] as number[]
  })

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      notification_type: initialData?.notification_type || 'announcement',
      priority: initialData?.priority || 'medium',
      expiry_mode: initialData?.expiry_mode || 'time_based',
      expire_after_hours: initialData?.expire_after_hours || 24,
      expire_when_all_read: initialData?.expire_when_all_read || false,
      target_groups_ids: initialData?.target_groups_ids || [],
      target_divisions_ids: initialData?.target_divisions_ids || [],
      target_positions_ids: initialData?.target_positions_ids || [],
      target_specific_users_ids: initialData?.target_specific_users_ids || [],
      publish_at: initialData?.publish_at || '',
      is_sticky: initialData?.is_sticky || false,
      requires_acknowledgment: initialData?.requires_acknowledgment || false,
    },
  })

  // Load allowed targets on component mount
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const targetsData = await notificationApi.admin.getAllowedTargets()
        setTargets(targetsData)
      } catch (err) {
        setError('Gagal memuat daftar target: ' + (err instanceof Error ? err.message : 'Unknown error'))
      }
    }
    loadTargets()
  }, [])

  // Update form when targets change
  useEffect(() => {
    form.setValue('target_groups_ids', selectedTargets.groups)
    form.setValue('target_divisions_ids', selectedTargets.divisions)
    form.setValue('target_positions_ids', selectedTargets.positions)
    form.setValue('target_specific_users_ids', selectedTargets.users)
  }, [selectedTargets, form])

  const onSubmit = async (data: NotificationFormValues) => {
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const notificationData: NotificationFormData = {
        ...data,
        target_groups_ids: selectedTargets.groups,
        target_divisions_ids: selectedTargets.divisions,
        target_positions_ids: selectedTargets.positions,
        target_specific_users_ids: selectedTargets.users,
      }

      const notification = await notificationApi.admin.createNotification(notificationData)
      
      setSuccess('Notifikasi berhasil dibuat!')
      
      if (onSuccess) {
        onSuccess(notification)
      } else {
        // Redirect to admin notifications page
        setTimeout(() => {
          router.push('/admin/notifications')
        }, 1500)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat notifikasi')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTargetChange = (type: 'groups' | 'divisions' | 'positions' | 'users', id: number, checked: boolean) => {
    setSelectedTargets(prev => ({
      ...prev,
      [type]: checked 
        ? [...prev[type], id]
        : prev[type].filter(targetId => targetId !== id)
    }))
  }

  const getNotificationTypeLabel = (type: string) => {
    const labels = {
      announcement: 'Pengumuman',
      system_alert: 'Peringatan Sistem',
      attendance_reminder: 'Pengingat Absensi',
      policy_update: 'Update Kebijakan',
      maintenance: 'Pemeliharaan Sistem',
      division_notice: 'Pemberitahuan Divisi',
      organization_wide: 'Pemberitahuan Organisasi'
    }
    return labels[type as keyof typeof labels] || type
  }

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi',
      urgent: 'Mendesak'
    }
    return labels[priority as keyof typeof labels] || priority
  }

  const getExpiryModeLabel = (mode: string) => {
    const labels = {
      manual: 'Manual (Admin Archive)',
      time_based: 'Berdasarkan Waktu',
      read_based: 'Setelah Semua User Membaca',
      hybrid: 'Waktu atau Setelah Dibaca'
    }
    return labels[mode as keyof typeof labels] || mode
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z" />
            </svg>
            Buat Notifikasi Baru
          </CardTitle>
          <CardDescription>
            Buat notifikasi untuk mengirimkan informasi penting kepada pengguna
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Error/Success Messages */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informasi Dasar</h3>
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Judul Notifikasi *</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan judul notifikasi" {...field} />
                      </FormControl>
                      <FormDescription>
                        Judul yang akan ditampilkan kepada pengguna
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konten Notifikasi *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Masukkan konten notifikasi"
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Konten detail yang akan dibaca oleh pengguna
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="notification_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Notifikasi *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tipe notifikasi" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="announcement">Pengumuman</SelectItem>
                            <SelectItem value="system_alert">Peringatan Sistem</SelectItem>
                            <SelectItem value="attendance_reminder">Pengingat Absensi</SelectItem>
                            <SelectItem value="policy_update">Update Kebijakan</SelectItem>
                            <SelectItem value="maintenance">Pemeliharaan Sistem</SelectItem>
                            <SelectItem value="division_notice">Pemberitahuan Divisi</SelectItem>
                            <SelectItem value="organization_wide">Pemberitahuan Organisasi</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioritas *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih prioritas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Rendah</SelectItem>
                            <SelectItem value="medium">Sedang</SelectItem>
                            <SelectItem value="high">Tinggi</SelectItem>
                            <SelectItem value="urgent">Mendesak</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Expiry Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pengaturan Kedaluwarsa</h3>
                
                <FormField
                  control={form.control}
                  name="expiry_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode Kedaluwarsa *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih mode kedaluwarsa" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual (Admin Archive)</SelectItem>
                          <SelectItem value="time_based">Berdasarkan Waktu</SelectItem>
                          <SelectItem value="read_based">Setelah Semua User Membaca</SelectItem>
                          <SelectItem value="hybrid">Waktu atau Setelah Dibaca</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Cara notifikasi akan kedaluwarsa
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('expiry_mode') === 'time_based' || form.watch('expiry_mode') === 'hybrid' ? (
                  <FormField
                    control={form.control}
                    name="expire_after_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kedaluwarsa Setelah (Jam) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="8760"
                            placeholder="24"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                          />
                        </FormControl>
                        <FormDescription>
                          Notifikasi akan kedaluwarsa setelah jam yang ditentukan
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {(form.watch('expiry_mode') === 'read_based' || form.watch('expiry_mode') === 'hybrid') && (
                  <FormField
                    control={form.control}
                    name="expire_when_all_read"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Kedaluwarsa ketika semua target user sudah membaca
                          </FormLabel>
                          <FormDescription>
                            Notifikasi akan otomatis kedaluwarsa setelah semua target user membacanya
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <Separator />

              {/* Targeting */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Target Pengguna</h3>
                <p className="text-sm text-gray-600">
                  Pilih siapa yang akan menerima notifikasi ini
                </p>

                {targets && (
                  <div className="space-y-4">
                    {/* Groups */}
                    {targets.groups.length > 0 && (
                      <div>
                        <Label className="text-base font-medium">Grup Pengguna</Label>
                        <div className="mt-2 space-y-2">
                          {targets.groups.map((group) => (
                            <div key={group.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`group-${group.id}`}
                                checked={selectedTargets.groups.includes(group.id)}
                                onCheckedChange={(checked) => 
                                  handleTargetChange('groups', group.id, checked as boolean)
                                }
                              />
                              <Label htmlFor={`group-${group.id}`} className="font-normal">
                                {group.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Divisions */}
                    {targets.divisions.length > 0 && (
                      <div>
                        <Label className="text-base font-medium">Divisi</Label>
                        <div className="mt-2 space-y-2">
                          {targets.divisions.map((division) => (
                            <div key={division.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`division-${division.id}`}
                                checked={selectedTargets.divisions.includes(division.id)}
                                onCheckedChange={(checked) => 
                                  handleTargetChange('divisions', division.id, checked as boolean)
                                }
                              />
                              <Label htmlFor={`division-${division.id}`} className="font-normal">
                                {division.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Positions */}
                    {targets.positions.length > 0 && (
                      <div>
                        <Label className="text-base font-medium">Jabatan</Label>
                        <div className="mt-2 space-y-2">
                          {targets.positions.map((position) => (
                            <div key={position.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`position-${position.id}`}
                                checked={selectedTargets.positions.includes(position.id)}
                                onCheckedChange={(checked) => 
                                  handleTargetChange('positions', position.id, checked as boolean)
                                }
                              />
                              <Label htmlFor={`position-${position.id}`} className="font-normal">
                                {position.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Targets Summary */}
                {selectedTargets.groups.length > 0 || selectedTargets.divisions.length > 0 || selectedTargets.positions.length > 0 ? (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Target Terpilih:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTargets.groups.map(id => {
                        const group = targets?.groups.find(g => g.id === id)
                        return group ? <Badge key={id} variant="secondary">{group.name}</Badge> : null
                      })}
                      {selectedTargets.divisions.map(id => {
                        const division = targets?.divisions.find(d => d.id === id)
                        return division ? <Badge key={id} variant="outline">{division.name}</Badge> : null
                      })}
                      {selectedTargets.positions.map(id => {
                        const position = targets?.positions.find(p => p.id === id)
                        return position ? <Badge key={id} variant="outline">{position.name}</Badge> : null
                      })}
                    </div>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Pilih minimal satu target untuk mengirim notifikasi
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Additional Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Opsi Tambahan</h3>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="is_sticky"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Notifikasi Sticky
                          </FormLabel>
                          <FormDescription>
                            Notifikasi akan selalu muncul di bagian atas daftar
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_acknowledgment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Memerlukan Konfirmasi
                          </FormLabel>
                          <FormDescription>
                            Pengguna harus mengkonfirmasi bahwa mereka telah membaca notifikasi
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel || (() => router.back())}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || selectedTargets.groups.length === 0 && selectedTargets.divisions.length === 0 && selectedTargets.positions.length === 0}
                >
                  {isLoading ? 'Menyimpan...' : 'Buat Notifikasi'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
