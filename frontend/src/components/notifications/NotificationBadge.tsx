"use client";

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { notificationApi } from '@/lib/api/notifications/client'

interface NotificationBadgeProps {
  className?: string
}

export default function NotificationBadge({ className }: NotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await notificationApi.user.getUnreadCount()
        setUnreadCount(data.unread_count)
      } catch (error) {
        console.error('Failed to load unread count:', error)
        setUnreadCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    loadUnreadCount()

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 ${className}`}
        disabled
      >
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z"
          />
        </svg>
        <span>Notifikasi</span>
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 relative ${className}`}
      onClick={() => window.location.href = '/notifications'}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-5 5v-5zM4.5 19.5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h15c1.1 0 2 .9 2 2v11.5c0 1.1-.9 2-2 2h-15zM4.5 6v11.5h15V6h-15z"
        />
      </svg>
      <span>Notifikasi</span>
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}
