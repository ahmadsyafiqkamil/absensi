import { v2Fetch } from '../../backend'
import type { 
  Notification, 
  NotificationFormData, 
  NotificationTargets, 
  NotificationStats
} from '../../types/notifications'

// Notification API Client
export const notificationApi = {
  // Admin endpoints
  admin: {
    // Get all notifications (admin view)
    getNotifications: async (): Promise<Notification[]> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch('/api/v2/notifications/admin/notifications/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      return response.json()
    },

    // Create notification
    createNotification: async (data: NotificationFormData): Promise<Notification> => {
      // Prepare JSON payload
      const payload: any = {
        title: data.title,
        content: data.content,
        notification_type: data.notification_type,
        priority: data.priority,
        expiry_mode: data.expiry_mode,
        expire_after_hours: data.expire_after_hours,
        expire_when_all_read: data.expire_when_all_read,
        is_sticky: data.is_sticky,
        requires_acknowledgment: data.requires_acknowledgment,
        target_groups: data.target_groups_ids || [],
        target_divisions: data.target_divisions_ids || [],
        target_positions: data.target_positions_ids || [],
        target_specific_users: data.target_specific_users_ids || [],
      }
      
      // Add optional fields
      if (data.publish_at) {
        payload.publish_at = data.publish_at
      }
      // Note: attachment handling will be implemented later if needed

      // Use proxy route to avoid SSL certificate issues
      const response = await fetch('/api/v2/notifications/admin/notifications/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to create notification' }))
        throw new Error(error.detail || 'Failed to create notification')
      }
      
      return response.json()
    },

    // Get allowed targets for current user
    getAllowedTargets: async (): Promise<NotificationTargets> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch('/api/v2/notifications/admin/notifications/allowed_targets/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch allowed targets')
      }
      return response.json()
    },

    // Publish notification
    publishNotification: async (id: number): Promise<{ message: string }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch(`/api/v2/notifications/admin/notifications/${id}/publish/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to publish notification' }))
        throw new Error(error.error || 'Failed to publish notification')
      }
      return response.json()
    },

    // Archive notification
    archiveNotification: async (id: number): Promise<{ message: string }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch(`/api/v2/notifications/admin/notifications/${id}/archive/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to archive notification' }))
        throw new Error(error.error || 'Failed to archive notification')
      }
      return response.json()
    },

    // Get notification statistics
    getNotificationStats: async (id: number): Promise<NotificationStats> => {
      const response = await v2Fetch(`/notifications/admin/notifications/${id}/stats/`)
      if (!response.ok) {
        throw new Error('Failed to fetch notification stats')
      }
      return response.json()
    },

    // Manual cleanup expired notifications
    cleanupExpired: async (): Promise<{ message: string }> => {
      const response = await v2Fetch('/notifications/admin/notifications/cleanup_expired/', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to cleanup expired notifications' }))
        throw new Error(error.error || 'Failed to cleanup expired notifications')
      }
      return response.json()
    }
  },

  // User endpoints
  user: {
    // Get user notifications
    getNotifications: async (unreadOnly: boolean = false, includeExpired: boolean = false): Promise<Notification[]> => {
      // Use proxy route to avoid SSL certificate issues
      const params = new URLSearchParams()
      if (unreadOnly) params.append('unread_only', 'true')
      if (includeExpired) params.append('include_expired', 'true')
      
      const queryString = params.toString()
      const url = `/api/v2/notifications/notifications/${queryString ? `?${queryString}` : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }
      return response.json()
    },

    // Mark notification as read
    markAsRead: async (id: number): Promise<{ message: string }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch(`/api/v2/notifications/notifications/${id}/mark_read/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to mark notification as read' }))
        throw new Error(error.error || 'Failed to mark notification as read')
      }
      return response.json()
    },

    // Acknowledge notification
    acknowledgeNotification: async (id: number): Promise<{ message: string }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch(`/api/v2/notifications/notifications/${id}/acknowledge/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to acknowledge notification' }))
        throw new Error(error.error || 'Failed to acknowledge notification')
      }
      return response.json()
    },

    // Get unread count
    getUnreadCount: async (): Promise<{ unread_count: number }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch('/api/v2/notifications/notifications/unread_count/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch unread count')
      }
      return response.json()
    },

    // Get notification summary
    getSummary: async (): Promise<{ total: number; unread: number; urgent: number; requires_acknowledgment: number }> => {
      // Use proxy route to avoid SSL certificate issues
      const response = await fetch('/api/v2/notifications/notifications/summary/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch notification summary')
      }
      return response.json()
    }
  }
}

export default notificationApi
