"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { notificationApi } from '@/lib/api/notifications/client'
import type { Notification } from '@/lib/types/notifications'

export default function UserNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [summary, setSummary] = useState<{ total: number; unread: number; urgent: number; requires_acknowledgment: number } | null>(null)

  // Load notifications
  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const [notificationsData, unreadData, summaryData] = await Promise.all([
        notificationApi.user.getNotifications(),
        notificationApi.user.getUnreadCount(),
        notificationApi.user.getSummary()
      ])
      
      setNotifications(notificationsData)
      setUnreadCount(unreadData.unread_count)
      setSummary(summaryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.user.markAsRead(id)
      await loadNotifications() // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menandai notifikasi sebagai dibaca')
    }
  }

  const handleAcknowledge = async (id: number) => {
    try {
      await notificationApi.user.acknowledgeNotification(id)
      await loadNotifications() // Reload to get updated status
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengkonfirmasi notifikasi')
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat notifikasi...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-gray-600 mt-1">Pemberitahuan dan pengumuman penting</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{summary.total}</div>
                <div className="text-sm text-gray-600">Total Notifikasi</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{summary.unread}</div>
                <div className="text-sm text-gray-600">Belum Dibaca</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{summary.urgent}</div>
                <div className="text-sm text-gray-600">Mendesak</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{summary.requires_acknowledgment}</div>
                <div className="text-sm text-gray-600">Perlu Konfirmasi</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada notifikasi</h3>
              <p className="text-gray-600">Belum ada notifikasi yang ditujukan untuk Anda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id} className={`${notification.is_sticky ? 'border-blue-300 bg-blue-50' : ''} ${!notification.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
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
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">
                            Baru
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {notification.notification_type_display} • {formatDate(notification.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(notification.priority)}
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
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div>
                        Dari: {notification.created_by}
                        {notification.expires_at && (
                          <span className="ml-4">
                            Kedaluwarsa: {formatDate(notification.expires_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {notification.is_read && notification.read_at && (
                          <span>Dibaca: {formatDate(notification.read_at)}</span>
                        )}
                        {notification.acknowledged_at && (
                          <span>Dikonfirmasi: {formatDate(notification.acknowledged_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Tandai Dibaca
                        </Button>
                      )}
                      {notification.requires_acknowledgment && !notification.acknowledged_at && (
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledge(notification.id)}
                        >
                          Konfirmasi
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
