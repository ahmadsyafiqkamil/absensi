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
        console.log('[NotificationBadge] Loading unread count...')
        const data = await notificationApi.user.getUnreadCount()
        console.log('[NotificationBadge] Unread count data:', data)
        setUnreadCount(data.unread_count)
        console.log('[NotificationBadge] Set unread count to:', data.unread_count)
      } catch (error) {
        console.error('[NotificationBadge] Failed to load unread count:', error)
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

  console.log('[NotificationBadge] Render - isLoading:', isLoading, 'unreadCount:', unreadCount)

  if (isLoading) {
    console.log('[NotificationBadge] Rendering loading state')
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

  console.log('[NotificationBadge] Rendering with unreadCount:', unreadCount)
  console.log('[NotificationBadge] Should show badge:', unreadCount > 0)
  
  // Force show badge for testing if unreadCount > 0
  const shouldShowBadge = unreadCount > 0
  console.log('[NotificationBadge] Final decision - shouldShowBadge:', shouldShowBadge)
  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className={`flex items-center space-x-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 ${className}`}
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
      </Button>
      {shouldShowBadge && (
        <>
          <div 
            className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center text-xs font-bold rounded-full"
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: '2px solid white',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 20
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        </>
      )}
    </div>
  )
}
