import { Position, User, Employee, ApprovalCapabilities as BackendApprovalCapabilities } from './types'

export interface ApprovalCapabilities {
  overtime: boolean
  attendance_correction: boolean
  monthly_summary: boolean
  division_level: boolean
  organization_level: boolean
}

// Enhanced types for multi-position support
export interface MultiPositionApprovalInfo {
  total_positions: number
  primary_position: Position | null
  highest_approval_level: number
  can_approve_org_wide: boolean
  position_summary: string[]
}

export function getApprovalCapabilities(position: Position | null): ApprovalCapabilities {
  if (!position) {
    return {
      overtime: false,
      attendance_correction: false,
      monthly_summary: false,
      division_level: false,
      organization_level: false
    }
  }

  const level = position.approval_level || 0
  const orgWide = position.can_approve_overtime_org_wide || false

  return {
    overtime: level > 0,
    attendance_correction: level > 0,
    monthly_summary: level > 0,
    division_level: level >= 1,
    organization_level: level >= 2 && orgWide
  }
}

export function canApproveOvertime(position: Position | null): boolean {
  return getApprovalCapabilities(position).overtime
}

export function canApproveAttendanceCorrection(position: Position | null): boolean {
  return getApprovalCapabilities(position).attendance_correction
}

export function canApproveMonthlySummary(position: Position | null): boolean {
  return getApprovalCapabilities(position).monthly_summary
}

export function canApproveDivisionLevel(position: Position | null): boolean {
  return getApprovalCapabilities(position).division_level
}

export function canApproveOrganizationLevel(position: Position | null): boolean {
  return getApprovalCapabilities(position).organization_level
}

export function getApprovalLevelDescription(level: number): string {
  switch (level) {
    case 0:
      return 'No Approval - Tidak dapat melakukan approval apapun'
    case 1:
      return 'Division Level - Dapat approve request dari divisi sendiri'
    case 2:
      return 'Organization Level - Dapat approve request dari semua divisi (final approval)'
    default:
      return 'Unknown Level - Level approval tidak dikenali'
  }
}

export function getApprovalLevelColor(level: number): string {
  switch (level) {
    case 0:
      return 'text-red-600 bg-red-50 border-red-200'
    case 1:
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 2:
      return 'text-green-600 bg-green-50 border-green-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// ==================== MULTI-POSITION SUPPORT FUNCTIONS ====================

/**
 * Enhanced approval capabilities function that supports multi-position
 * Uses backend-computed approval_capabilities if available, falls back to legacy position
 */
export function getApprovalCapabilitiesEnhanced(
  user: User | Employee | null, 
  useMultiPosition = true
): ApprovalCapabilities {
  if (!user) {
    return {
      overtime: false,
      attendance_correction: false,
      monthly_summary: false,
      division_level: false,
      organization_level: false
    }
  }

  // Use new multi-position data if available and enabled
  if (useMultiPosition && user.approval_capabilities) {
    const { approval_level, can_approve_overtime_org_wide } = user.approval_capabilities
    
    return {
      overtime: approval_level > 0,
      attendance_correction: approval_level > 0,
      monthly_summary: approval_level > 0,
      division_level: approval_level >= 1,
      organization_level: approval_level >= 2 && can_approve_overtime_org_wide
    }
  }

  // Fallback to legacy single position
  const position = user.position || user.primary_position || null
  return getApprovalCapabilities(position)
}

/**
 * Get detailed multi-position approval information
 */
export function getMultiPositionApprovalInfo(user: User | Employee | null): MultiPositionApprovalInfo {
  if (!user) {
    return {
      total_positions: 0,
      primary_position: null,
      highest_approval_level: 0,
      can_approve_org_wide: false,
      position_summary: ['No positions assigned']
    }
  }

  // Use multi-position data if available
  if (user.approval_capabilities && user.approval_capabilities.active_positions) {
    const { active_positions, approval_level, can_approve_overtime_org_wide } = user.approval_capabilities
    
    return {
      total_positions: active_positions.length,
      primary_position: user.primary_position || null,
      highest_approval_level: approval_level,
      can_approve_org_wide: can_approve_overtime_org_wide,
      position_summary: active_positions.map(pos => 
        `${pos.name} (Level ${pos.approval_level}${pos.can_approve_overtime_org_wide ? ', Org-wide' : ''})`
      )
    }
  }

  // Fallback to legacy position
  const position = user.position || user.primary_position
  if (position) {
    return {
      total_positions: 1,
      primary_position: position,
      highest_approval_level: position.approval_level,
      can_approve_org_wide: position.can_approve_overtime_org_wide,
      position_summary: [
        `${position.name} (Level ${position.approval_level}${position.can_approve_overtime_org_wide ? ', Org-wide' : ''})`
      ]
    }
  }

  return {
    total_positions: 0,
    primary_position: null,
    highest_approval_level: 0,
    can_approve_org_wide: false,
    position_summary: ['No position assigned']
  }
}

/**
 * Check if user can approve overtime using multi-position data
 */
export function canApproveOvertimeEnhanced(user: User | Employee | null): boolean {
  return getApprovalCapabilitiesEnhanced(user).overtime
}

/**
 * Check if user can approve attendance corrections using multi-position data
 */
export function canApproveAttendanceCorrectionEnhanced(user: User | Employee | null): boolean {
  return getApprovalCapabilitiesEnhanced(user).attendance_correction
}

/**
 * Check if user can approve monthly summaries using multi-position data
 */
export function canApproveMonthlySummaryEnhanced(user: User | Employee | null): boolean {
  return getApprovalCapabilitiesEnhanced(user).monthly_summary
}

/**
 * Check if user has division-level approval using multi-position data
 */
export function canApproveDivisionLevelEnhanced(user: User | Employee | null): boolean {
  return getApprovalCapabilitiesEnhanced(user).division_level
}

/**
 * Check if user has organization-level approval using multi-position data
 */
export function canApproveOrganizationLevelEnhanced(user: User | Employee | null): boolean {
  return getApprovalCapabilitiesEnhanced(user).organization_level
}

/**
 * Get approval level description with multi-position context
 */
export function getApprovalLevelDescriptionEnhanced(user: User | Employee | null): string {
  const info = getMultiPositionApprovalInfo(user)
  
  if (info.total_positions === 0) {
    return 'No positions assigned - Cannot approve anything'
  }
  
  if (info.total_positions === 1) {
    return getApprovalLevelDescription(info.highest_approval_level)
  }
  
  const baseDescription = getApprovalLevelDescription(info.highest_approval_level)
  return `${baseDescription} (from ${info.total_positions} positions)`
}

/**
 * Backward compatibility function - uses enhanced version by default
 * This allows existing code to automatically benefit from multi-position support
 */
export function getApprovalCapabilitiesCompat(
  positionOrUser: Position | User | Employee | null
): ApprovalCapabilities {
  // If it's a Position object (has approval_level property but no username)
  if (positionOrUser && 'approval_level' in positionOrUser && !('username' in positionOrUser)) {
    return getApprovalCapabilities(positionOrUser as Position)
  }
  
  // If it's a User or Employee object
  return getApprovalCapabilitiesEnhanced(positionOrUser as User | Employee)
}

