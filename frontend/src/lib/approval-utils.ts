import { Position } from './types'

export interface ApprovalCapabilities {
  overtime: boolean
  attendance_correction: boolean
  monthly_summary: boolean
  division_level: boolean
  organization_level: boolean
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

