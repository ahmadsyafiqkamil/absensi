"use client"

import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import type { ApiError } from './types'

// Generic API hook for data fetching
export function useApi<T>(
  apiFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunction()
      setData(result)
    } catch (err) {
      setError(err as ApiError)
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  useEffect(() => {
    fetchData()
  }, dependencies)

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}

// Employee hooks
export function useDivisions() {
  return useApi(() => api.employees.getDivisions(), [])
}

export function usePositions() {
  return useApi(() => api.employees.getPositions(), [])
}

export function useEmployees(filters?: any) {
  return useApi(() => api.employees.getEmployees(filters), [filters])
}

export function useMyProfile() {
  return useApi(() => api.employees.getMyProfile(), [])
}

// Settings hooks
export function useWorkSettings() {
  return useApi(() => api.settings.getWorkSettings(), [])
}

export function useHolidays() {
  return useApi(() => api.settings.getHolidays(), [])
}

// Attendance hooks
export function useAttendances(filters?: any) {
  return useApi(() => api.attendance.getAttendances(filters), [filters])
}

export function useTodayAttendance() {
  return useApi(() => api.attendance.getTodayAttendance(), [])
}

export function useAttendanceSummary(filters?: any) {
  return useApi(() => api.attendance.getAttendanceSummary(filters), [filters])
}

// Corrections hooks
export function useCorrections(filters?: any) {
  return useApi(() => api.corrections.getCorrections(filters), [filters])
}

export function useMyCorrections() {
  return useApi(() => api.corrections.getMyCorrections(), [])
}

export function usePendingCorrections() {
  return useApi(() => api.corrections.getPendingCorrections(), [])
}

// Overtime hooks
export function useOvertimeRequests(filters?: any) {
  return useApi(() => api.overtime.getOvertimeRequests(filters), [filters])
}

export function useMyOvertime() {
  return useApi(() => api.overtime.getMyOvertime(), [])
}

export function usePendingOvertime() {
  return useApi(() => api.overtime.getPendingOvertime(), [])
}

export function useMonthlySummaryRequests(filters?: any) {
  return useApi(() => api.overtime.getMonthlySummaryRequests(filters), [filters])
}

export function useMySummaries() {
  return useApi(() => api.overtime.getMySummaries(), [])
}

export function usePendingSummaries() {
  return useApi(() => api.overtime.getPendingSummaries(), [])
}

// Reporting hooks
export function useReportTemplates() {
  return useApi(() => api.reporting.getReportTemplates(), [])
}

export function useGeneratedReports(filters?: any) {
  return useApi(() => api.reporting.getGeneratedReports(filters), [filters])
}

export function useReportSchedules() {
  return useApi(() => api.reporting.getReportSchedules(), [])
}

// Mutation hooks
export function useApiMutation<T, R>(
  apiFunction: (data: T) => Promise<R>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [data, setData] = useState<R | null>(null)

  const mutate = useCallback(async (payload: T) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiFunction(payload)
      setData(result)
      return result
    } catch (err) {
      setError(err as ApiError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [apiFunction])

  return { mutate, loading, error, data }
}

// Specific mutation hooks
export function useUpdateWorkSettings() {
  return useApiMutation(api.settings.updateWorkSettings)
}

export function useCreateHoliday() {
  return useApiMutation(api.settings.createHoliday)
}

export function useUpdateHoliday() {
  return useApiMutation(({ id, ...data }: { id: number } & any) => 
    api.settings.updateHoliday(id, data)
  )
}

export function useDeleteHoliday() {
  return useApiMutation((id: number) => api.settings.deleteHoliday(id))
}

export function useCheckIn() {
  return useApiMutation(api.attendance.checkIn)
}

export function useCheckOut() {
  return useApiMutation(api.attendance.checkOut)
}

export function useCreateCorrection() {
  return useApiMutation(api.corrections.createCorrection)
}

export function useApproveCorrection() {
  return useApiMutation(({ id, approved, rejection_reason }: { id: number; approved: boolean; rejection_reason?: string }) =>
    api.corrections.approveCorrection(id, approved, rejection_reason)
  )
}

export function useCreateOvertimeRequest() {
  return useApiMutation(api.overtime.createOvertimeRequest)
}

export function useApproveOvertime() {
  return useApiMutation(({ id, approved, rejection_reason }: { id: number; approved: boolean; rejection_reason?: string }) =>
    api.overtime.approveOvertime(id, approved, rejection_reason)
  )
}

export function useCreateMonthlySummaryRequest() {
  return useApiMutation(api.overtime.createMonthlySummaryRequest)
}

export function useApproveMonthlySummary() {
  return useApiMutation(({ id, approved, rejection_reason }: { id: number; approved: boolean; rejection_reason?: string }) =>
    api.overtime.approveMonthlySummary(id, approved, rejection_reason)
  )
}

export function useGenerateAttendanceReport() {
  return useApiMutation(api.reporting.generateAttendanceReport)
}

export function useGenerateOvertimeReport() {
  return useApiMutation(api.reporting.generateOvertimeReport)
}

export function useGenerateSummaryReport() {
  return useApiMutation(api.reporting.generateSummaryReport)
}

export function useCreateReportSchedule() {
  return useApiMutation(api.reporting.createReportSchedule)
}

export function useUpdateReportSchedule() {
  return useApiMutation(({ id, ...data }: { id: number } & any) =>
    api.reporting.updateReportSchedule(id, data)
  )
}

export function useDeleteReportSchedule() {
  return useApiMutation((id: number) => api.reporting.deleteReportSchedule(id))
}

export function useSupervisorApprovalLevel() {
  const [approvalLevel, setApprovalLevel] = useState<number | null>(null)
  const [canApprove, setCanApprove] = useState(false)
  const [isLevel0, setIsLevel0] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [approvalSource, setApprovalSource] = useState<string>('')

  useEffect(() => {
    const fetchApprovalLevel = async () => {
      try {
        // Fetch user profile data with new multi-role structure
        const response = await fetch('/api/auth/me', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        console.log('Approval level response:', result)

        // Use groups from API response
        const userGroups = result.groups || []
        setUserRoles(userGroups)

        // Determine approval level based on position data
        let level = 0
        let source = 'No position'

        if (result.position) {
          level = result.position.approval_level || 0
          source = `Position: ${result.position.name}`
        } else if (userGroups.includes('admin') || result.is_superuser) {
          level = 2
          source = 'Admin/Superuser'
        } else if (userGroups.includes('supervisor')) {
          level = 1
          source = 'Supervisor group'
        }

        console.log('Approval level calculation:', {
          userGroups,
          position: result.position,
          level,
          source
        })

        setApprovalLevel(level)
        setCanApprove(level > 0)
        setIsLevel0(level === 0)
        setApprovalSource(source)

      } catch (error) {
        console.error('Error fetching approval level:', error)
        // Fallback values
        setApprovalLevel(0)
        setCanApprove(false)
        setIsLevel0(true)
        setApprovalSource('Error loading data')
        setUserRoles([])
      } finally {
        setLoading(false)
      }
    }

    fetchApprovalLevel()
  }, [])

  return {
    approvalLevel,
    canApprove,
    isLevel0,
    loading,
    userGroups: userRoles, // Return userRoles as userGroups for compatibility
    userRoles, // Also return userRoles for new code
    approvalSource,
  }
}
