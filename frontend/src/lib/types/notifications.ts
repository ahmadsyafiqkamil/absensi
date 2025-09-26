// Notification Types untuk Frontend
import type { User, Group, Division, Position } from '../types'
export interface Notification {
  id: number
  title: string
  content: string
  notification_type: 'announcement' | 'system_alert' | 'attendance_reminder' | 'policy_update' | 'maintenance' | 'division_notice' | 'organization_wide'
  notification_type_display: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  priority_display: string
  status: 'draft' | 'published' | 'archived' | 'expired'
  status_display: string
  expiry_mode: 'manual' | 'time_based' | 'read_based' | 'hybrid'
  expiry_mode_display: string
  expires_at?: string
  expire_after_hours: number
  expire_when_all_read: boolean
  target_groups: Group[]
  target_divisions: Division[]
  target_positions: Position[]
  target_specific_users: User[]
  publish_at?: string
  created_by: string
  created_at: string
  updated_at: string
  attachment?: string
  attachment_url?: string
  is_sticky: boolean
  requires_acknowledgment: boolean
  is_expired: boolean
  is_read?: boolean
  read_at?: string
  acknowledged_at?: string
}

export interface NotificationFormData {
  title: string
  content: string
  notification_type: 'announcement' | 'system_alert' | 'attendance_reminder' | 'policy_update' | 'maintenance' | 'division_notice' | 'organization_wide'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  expiry_mode: 'manual' | 'time_based' | 'read_based' | 'hybrid'
  expire_after_hours: number
  expire_when_all_read: boolean
  target_groups_ids: number[]
  target_divisions_ids: number[]
  target_positions_ids: number[]
  target_specific_users_ids: number[]
  publish_at?: string
  attachment?: File
  is_sticky: boolean
  requires_acknowledgment: boolean
}

export interface NotificationTargets {
  groups: { id: number; name: string }[]
  divisions: { id: number; name: string }[]
  positions: { id: number; name: string }[]
  organization_wide: boolean
  division_wide: boolean
}

export interface NotificationStats {
  total_target_users: number
  read_count: number
  unread_count: number
  is_expired: boolean
  expiry_mode: string
  expires_at?: string
}
