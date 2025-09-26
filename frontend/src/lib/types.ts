// Core types for the application
export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_superuser: boolean
  groups: string[]
  date_joined: string
  last_login: string
  
  // Multi-position support (from auth response)
  position?: Position | null // Legacy field for backward compatibility
  positions?: EmployeePosition[] // New multi-position data
  primary_position?: Position | null // Primary position
  approval_capabilities?: ApprovalCapabilities // Combined approval capabilities
}

// Employee Management Types
export interface Division {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Position {
  id: number
  name: string
  description?: string
  approval_level: number
  can_approve_overtime_org_wide: boolean
  created_at: string
  updated_at: string
}

// Multi-Position Support Types
export interface EmployeePosition {
  id: number
  position: Position
  is_primary: boolean
  is_active: boolean
  effective_from: string
  effective_until?: string | null
  assignment_notes?: string
  assigned_by?: User | null
  created_at: string
  updated_at: string
}

export interface ApprovalCapabilities {
  approval_level: number
  can_approve_overtime_org_wide: boolean
  active_positions: {
    id: number
    name: string
    approval_level: number
    can_approve_overtime_org_wide: boolean
  }[]
}

export interface Employee {
  id: number
  user: User
  division: Division
  position: Position // Legacy field for backward compatibility
  employee_id: string
  fullname: string
  phone?: string
  address?: string
  gaji_pokok: number
  tanggal_lahir?: string
  tanggal_bergabung: string
  status: 'active' | 'inactive' | 'terminated'
  created_at: string
  updated_at: string

  // Multi-position support
  employee_positions?: EmployeePosition[] // All position assignments
  primary_position?: Position | null // Primary position
  approval_capabilities?: ApprovalCapabilities // Combined approval capabilities

  // Multi-role support (existing)
  roles?: EmployeeRole[]
  primary_role?: EmployeeRole
}

// Role Management Types
export interface Role {
  id: number
  name: string
  display_name: string
  description?: string
  role_category: 'admin' | 'supervisor' | 'employee' | 'system'
  approval_level: number
  approval_level_display?: string
  is_active: boolean
  sort_order: number
  is_system_role: boolean
  max_users?: number
  role_priority: number
  permissions: Record<string, string[]>
  user_count: number
  can_assign_more_users: boolean
  category_display?: string
  created_at: string
  updated_at: string

  // Phase 2: Hierarchy & Inheritance
  parent_role?: Role | null
  inherit_permissions: boolean
  hierarchy_level?: number
  descendants_count?: number

  // Phase 2: Methods (computed on frontend)
  get_all_permissions?: () => Record<string, string[]>
  has_permission_inherited?: (type: string, action: string) => boolean
  get_child_roles?: () => Role[]
  get_parent_chain?: () => Role[]
}

export interface EmployeeRole {
  id: number
  employee: Employee
  role: Role
  is_primary: boolean
  is_active: boolean
  assigned_by: User
  assigned_at: string
  notes?: string
  expires_at?: string
  deactivated_at?: string
  deactivated_by?: User
  updated_at: string
}

// Phase 2: Role Template Types
export interface RoleTemplate {
  id: number
  name: string
  display_name: string
  description: string
  category: 'system' | 'organizational' | 'departmental' | 'custom'
  base_role_category: Role['role_category']
  base_approval_level: number
  base_permissions: Record<string, string[]>
  base_max_users?: number
  base_role_priority: number
  is_system_template: boolean
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

// Phase 2: Hierarchy & Analytics Types
export interface RoleHierarchyNode {
  role: Role
  children: RoleHierarchyNode[]
  level: number
  permissions_count: number
  descendant_count: number
}

export interface RoleAnalytics {
  total_roles: number
  active_roles: number
  system_roles: number
  roles_by_category: Record<string, number>
  template_usage: {
    template_name: string
    usage_count: number
    percentage: number
  }[]
  hierarchy_depth: number
  average_permissions_per_role: number
}

export interface TemplateStats {
  total_templates: number
  system_templates: number
  active_templates: number
  total_usage: number
  most_used_template: {
    name: string
    usage_count: number
  } | null
}

export interface RoleAssignment {
  employee_id: number
  role_id: number
  is_primary: boolean
  is_active: boolean
  notes?: string
  expires_at?: string
}

// Settings Types
export interface WorkSettings {
  id: number
  work_hours_start: string
  work_hours_end: string
  work_hours_total: number
  lateness_threshold: number
  overtime_threshold: number
  overtime_rate: number
  geofence_latitude: number
  geofence_longitude: number
  geofence_radius: number
  timezone: string
  workdays: number[]
  created_at: string
  updated_at: string
}

export interface Holiday {
  id: number
  name: string
  date: string
  description?: string
  is_national: boolean
  created_at: string
  updated_at: string
}

// Attendance Types
export interface Attendance {
  id: number
  user: User
  date: string
  check_in_time?: string
  check_out_time?: string
  check_in_latitude?: number
  check_in_longitude?: number
  check_out_latitude?: number
  check_out_longitude?: number
  work_hours: number
  overtime_hours: number
  lateness_minutes: number
  overtime_approved: boolean
  overtime_approved_by?: User
  overtime_approved_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

// Correction Types
export interface AttendanceCorrection {
  id: number
  user: User
  employee: Employee
  original_attendance: Attendance
  correction_date: string
  correction_type: 'check_in' | 'check_out' | 'both'
  original_check_in_time?: string
  original_check_out_time?: string
  corrected_check_in_time?: string
  corrected_check_out_time?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: User
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

// Overtime Types
export interface OvertimeRequest {
  id: number
  user: User
  employee: Employee
  attendance: Attendance
  request_date: string
  overtime_hours: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: User
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export interface MonthlySummaryRequest {
  id: number
  user: User
  employee: Employee
  month: number
  year: number
  total_work_hours: number
  total_overtime_hours: number
  total_lateness_minutes: number
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: User
  approved_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

// Reporting Types
export interface ReportTemplate {
  id: number
  name: string
  description?: string
  template_type: 'attendance' | 'overtime' | 'summary'
  file_path: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GeneratedReport {
  id: number
  template: ReportTemplate
  generated_by: User
  report_type: 'attendance' | 'overtime' | 'summary'
  file_path: string
  file_size: number
  generation_date: string
  parameters: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ReportSchedule {
  id: number
  template: ReportTemplate
  name: string
  description?: string
  cron_expression: string
  is_active: boolean
  last_run?: string
  last_run_status: 'success' | 'failed' | 'pending'
  created_at: string
  updated_at: string
}

export interface ReportAccessLog {
  id: number
  report: GeneratedReport
  user: User
  access_type: 'view' | 'download'
  access_date: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// API Response Types
export interface ApiResponse<T> {
  count?: number
  next?: string
  previous?: string
  results: T[]
}

export interface ApiError {
  detail: string
  code?: string
  field?: string
}

// Form Types
export interface LoginForm {
  username: string
  password: string
}

export interface AttendanceCheckInForm {
  latitude: number
  longitude: number
  notes?: string
}

export interface AttendanceCheckOutForm {
  latitude: number
  longitude: number
  notes?: string
}

export interface CorrectionRequestForm {
  correction_date: string
  correction_type: 'check_in' | 'check_out' | 'both'
  corrected_check_in_time?: string
  corrected_check_out_time?: string
  reason: string
}

export interface OvertimeRequestForm {
  attendance_id: number
  overtime_hours: number
  reason: string
}

// Filter Types
export interface DateRangeFilter {
  start_date: string
  end_date: string
}

export interface PaginationFilter {
  page?: number
  page_size?: number
}

export interface EmployeeFilter extends PaginationFilter {
  division_id?: number
  position_id?: number
  status?: string
  search?: string
}

export interface AttendanceFilter extends DateRangeFilter, PaginationFilter {
  user_id?: number
  division_id?: number
  status?: string
}

// Role Management Types
export interface Permission {
  id: number
  permission_type: string
  permission_action: string
  permission_type_display?: string
  permission_action_display?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GroupPermission {
  id: number
  group: Group
  group_name: string
  permission_type: string
  permission_action: string
  permission_type_display?: string
  permission_action_display?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Group {
  id: number
  name: string
  permissions?: GroupPermission[]
  permission_count?: number
  user_count?: number
  created_at?: string
  updated_at?: string
}

export interface RoleFormData {
  name: string
  display_name: string
  description?: string
  role_category: 'admin' | 'supervisor' | 'employee' | 'system'
  approval_level: number
  is_active: boolean
  sort_order: number
  is_system_role: boolean
  max_users?: number
  role_priority: number
  permissions: Record<string, string[]>
}

export interface EmployeeRoleFormData {
  employee_id: number
  role_id: number
  is_primary: boolean
  is_active: boolean
  notes?: string
  expires_at?: string
}

export interface BulkRoleAssignment {
  employee_ids: number[]
  role_id: number
  is_primary?: boolean
  is_active: boolean
  notes?: string
  expires_at?: string
}

// Multi-Position Form Types
export interface PositionAssignmentFormData {
  employee_id: number
  position_id: number
  is_primary: boolean
  is_active: boolean
  effective_from: string
  effective_until?: string
  assignment_notes?: string
}

export interface BulkPositionAssignmentFormData {
  employee_ids: number[]
  position_id: number
  is_primary: boolean
  is_active: boolean
  effective_from: string
  effective_until?: string
  assignment_notes?: string
}

export interface SetPrimaryPositionFormData {
  employee_id: number
  position_id: number
}

// Permission Management Types
export interface PermissionTemplate {
  id: number
  name: string
  description?: string
  permissions: Record<string, string[]>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PermissionSummary {
  group_id: number
  group_name: string
  total_permissions: number
  active_permissions: number
  permission_types: string[]
  permission_actions: string[]
}

// Status Types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'overtime'
export type ReportStatus = 'success' | 'failed' | 'pending'
export type RoleCategory = 'admin' | 'supervisor' | 'employee' | 'system'
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'reject' | 'export' | 'import'

// Re-export notification types
export * from './types/notifications'
