"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { notificationApi } from '@/lib/api/notifications/client'
import type { Notification } from '@/lib/types/notifications'

function AdminNotificationsList() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  // Load notifications
  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const notificationsData = await notificationApi.admin.getNotifications()
      setNotifications(notificationsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handlePublish = async (id: number) => {
    try {
      await notificationApi.admin.publishNotification(id)
      await loadNotifications() // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mempublikasikan notifikasi')
    }
  }

  const handleArchive = async (id: number) => {
    try {
      await notificationApi.admin.archiveNotification(id)
      await loadNotifications() // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengarsipkan notifikasi')
    }
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      urgent: 'destructive'
    } as const
    
    const labels = {
      low: 'Rendah',
      medium: 'Sedang',
      high: 'Tinggi',
      urgent: 'Mendesak'
    }
    
    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      published: 'default',
      archived: 'outline',
      expired: 'destructive'
    } as const
    
    const labels = {
      draft: 'Draft',
      published: 'Dipublikasikan',
      archived: 'Diarsipkan',
      expired: 'Kedaluwarsa'
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter notifications
  const filteredNotifications = (notifications || []).filter(notification => {
    if (!notification) return false
    
    const matchesSearch = (notification.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (notification.content || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || notification.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat notifikasi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Notifikasi</h1>
          <p className="text-gray-600 mt-1">Kelola dan pantau semua notifikasi sistem</p>
        </div>
        <Button onClick={() => router.push('/admin/notifications/create')}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Buat Notifikasi
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Cari Notifikasi</label>
              <Input
                placeholder="Cari berdasarkan judul atau konten..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Dipublikasikan</SelectItem>
                  <SelectItem value="archived">Diarsipkan</SelectItem>
                  <SelectItem value="expired">Kedaluwarsa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Prioritas</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Prioritas</SelectItem>
                  <SelectItem value="low">Rendah</SelectItem>
                  <SelectItem value="medium">Sedang</SelectItem>
                  <SelectItem value="high">Tinggi</SelectItem>
                  <SelectItem value="urgent">Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada notifikasi</h3>
            <p className="text-gray-600">Belum ada notifikasi yang dibuat</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <Card key={notification.id} className={`${notification.is_sticky ? 'border-blue-300 bg-blue-50' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {notification.title}
                      {notification.is_sticky && (
                        <Badge variant="outline" className="text-xs">
                          Sticky
                        </Badge>
                      )}
                      {notification.requires_acknowledgment && (
                        <Badge variant="secondary" className="text-xs">
                          Perlu Konfirmasi
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {notification.notification_type_display} • Dibuat oleh {notification.created_by} • {formatDate(notification.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getPriorityBadge(notification.priority)}
                    {getStatusBadge(notification.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Content */}
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap">{notification.content}</p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <div><strong>Mode Kedaluwarsa:</strong> {notification.expiry_mode_display}</div>
                      {notification.expires_at && (
                        <div><strong>Kedaluwarsa:</strong> {formatDate(notification.expires_at)}</div>
                      )}
                      <div><strong>Target:</strong> 
                        {notification.target_groups?.length > 0 && ` ${notification.target_groups.length} grup`}
                        {notification.target_divisions?.length > 0 && ` ${notification.target_divisions.length} divisi`}
                        {notification.target_positions?.length > 0 && ` ${notification.target_positions.length} jabatan`}
                        {notification.target_specific_users?.length > 0 && ` ${notification.target_specific_users.length} pengguna`}
                      </div>
                    </div>
                    <div>
                      <div><strong>Status:</strong> {notification.status_display}</div>
                      <div><strong>Diperbarui:</strong> {formatDate(notification.updated_at)}</div>
                      {notification.publish_at && (
                        <div><strong>Dijadwalkan:</strong> {formatDate(notification.publish_at)}</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {notification.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(notification.id)}
                      >
                        Publikasikan
                      </Button>
                    )}
                    {notification.status === 'published' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(notification.id)}
                      >
                        Arsipkan
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/notifications/${notification.id}`)}
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminNotificationsList
