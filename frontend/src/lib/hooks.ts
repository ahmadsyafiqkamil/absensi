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
  const [multiPositionInfo, setMultiPositionInfo] = useState<any>(null)
  
  // Use current context hook for real-time position switching
  const { data: currentContext } = useCurrentContext()

  useEffect(() => {
    const fetchApprovalLevel = async () => {
      try {
        // Fetch user profile data with new multi-role structure
        const response = await fetch('/api/v2/auth/me/', {
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

        // Enhanced approval level calculation with multi-position support
        let level = 0
        let source = 'No position'
        let positionInfo = null

        // Priority 1: Use backend-computed approval_capabilities
        if (result.approval_capabilities) {
          level = result.approval_capabilities.approval_level || 0
          const activePositions = result.approval_capabilities.active_positions || []
          source = `Multi-position: ${activePositions.length} positions (max level ${level})`
          positionInfo = {
            total_positions: activePositions.length,
            active_positions: activePositions,
            primary_position: result.primary_position,
            highest_level: level
          }
        }
        // Priority 2: Use primary_position
        else if (result.primary_position) {
          level = result.primary_position.approval_level || 0
          source = `Primary Position: ${result.primary_position.name}`
          positionInfo = {
            total_positions: result.positions?.length || 1,
            primary_position: result.primary_position,
            highest_level: level
          }
        }
        // Priority 3: Use legacy position field
        else if (result.position) {
          level = result.position.approval_level || 0
          source = `Legacy Position: ${result.position.name}`
          positionInfo = {
            total_positions: 1,
            primary_position: result.position,
            highest_level: level
          }
        }
        // Priority 4: Use group-based fallback
        else if (userGroups.includes('admin') || result.is_superuser) {
          level = 2
          source = 'Admin/Superuser group'
        } else if (userGroups.includes('supervisor')) {
          level = 1
          source = 'Supervisor group'
        }

        // Override with current context if available (for real-time position switching)
        if (currentContext) {
          level = currentContext.approval_level || 0
          source = `Current Context: ${currentContext.active_position?.name || currentContext.context}`
          console.log('Using current context for approval level:', {
            context: currentContext.context,
            approval_level: currentContext.approval_level,
            active_position: currentContext.active_position?.name
          })
        }

        console.log('Enhanced approval level calculation:', {
          userGroups,
          approval_capabilities: result.approval_capabilities,
          primary_position: result.primary_position,
          legacy_position: result.position,
          positions_count: result.positions?.length || 0,
          current_context: currentContext,
          final_level: level,
          source,
          position_info: positionInfo
        })

        setApprovalLevel(level)
        setCanApprove(level > 0)
        setIsLevel0(level === 0)
        setApprovalSource(source)
        setMultiPositionInfo(positionInfo)

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
  }, [currentContext]) // Re-run when current context changes

  return {
    approvalLevel,
    canApprove,
    isLevel0,
    loading,
    userGroups: userRoles, // Return userRoles as userGroups for compatibility
    userRoles, // Also return userRoles for new code
    approvalSource,
    multiPositionInfo, // New multi-position information
  }
}

// ==================== MULTI-POSITION HOOKS ====================

/**
 * Hook for fetching employee positions
 */
export function useEmployeePositions(employeeId: number) {
  return useApi(() => 
    fetch(`/api/v2/employees/employee-positions/?employee=${employeeId}`, {
      credentials: 'include'
    }).then(res => res.json()), 
    [employeeId]
  )
}

/**
 * Hook for assigning position to employee
 */
export function useAssignPosition() {
  return useApiMutation(async (data: any) => {
    const response = await fetch('/api/v2/employees/employee-positions/assign_position/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to assign position: ${response.statusText}`);
    }
    
    return response.json();
  });
}

/**
 * Hook for bulk position assignment
 */
export function useBulkAssignPosition() {
  return useApiMutation(async (data: any) => {
    const response = await fetch('/api/v2/employees/employee-positions/bulk_assign/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to bulk assign position: ${response.statusText}`);
    }
    
    return response.json();
  });
}

/**
 * Hook for setting primary position
 */
export function useSetPrimaryPosition() {
  return useApiMutation(async (data: { employee_id: number; position_id: number }) => {
    const response = await fetch('/api/v2/employees/employee-positions/set_primary/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to set primary position: ${response.statusText}`);
    }
    
    return response.json();
  });
}

/**
 * Hook for deactivating position assignment
 */
export function useDeactivatePosition() {
  return useApiMutation(async (assignmentId: number) => {
    const response = await fetch(`/api/v2/employees/employee-positions/${assignmentId}/deactivate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to deactivate position: ${response.statusText}`);
    }
    
    return response.json();
  });
}

// ==================== POSITION SWITCHING HOOKS ====================

/**
 * Hook for fetching available position contexts
 */
export function useAvailableContexts() {
  return useApi(() => 
    fetch('/api/v2/employees/employees/available_contexts/', {
      credentials: 'include',
      cache: 'no-store'
    }).then(res => res.json()), 
    []
  )
}

/**
 * Hook for fetching current position context
 */
export function useCurrentContext() {
  return useApi(async () => {
    // Get token from localStorage (temporary solution for development)
    const token = typeof window !== 'undefined' ? localStorage.getItem('dev_access_token') : null;
    
    if (!token) {
      // Return empty data if no token available
      return null;
    }
    
    const response = await fetch('http://localhost:8000/api/v2/employees/employees/current_context/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Token might be expired, remove it
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dev_access_token');
      }
      throw new Error('Failed to fetch current context');
    }
    
    return response.json();
  }, [])
}

/**
 * Hook for switching position context
 */
export function useSwitchPosition() {
  return useApiMutation(async (positionId: number | null) => {
    const response = await fetch('/api/v2/employees/employees/switch_position/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ position_id: positionId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to switch position: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Auto-refresh page after successful position switch
    if (result.success) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
    return result;
  });
}
