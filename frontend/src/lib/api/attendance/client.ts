/**
 * Attendance API Client
 * Handles attendance-related API calls
 */

import {
  ApiResponse,
  ApiError,
  Attendance,
  AttendanceCorrection,
  AttendanceFilter,
  AttendanceCheckInForm,
  AttendanceCheckOutForm,
  CorrectionRequestForm,
  DateRangeFilter,
  PaginationFilter
} from '@/lib/types'

// Generic API error handler
function handleApiError(error: any): ApiError {
  if (error.detail) return error
  return { detail: 'An unexpected error occurred' }
}

// Legacy fetch function for API calls with consistent configuration
async function legacyFetch(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: 'include', // Include cookies for authentication
    cache: 'no-store'
  })

  return response
}

// Attendance API client
export const attendanceApi = {
  // Attendance records
  getAttendances: async (filters?: AttendanceFilter): Promise<ApiResponse<Attendance>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }

      const response = await legacyFetch(`/attendance/attendance/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getAttendance: async (id: number): Promise<Attendance> => {
    try {
      const response = await legacyFetch(`/attendance/attendance/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Check-in/out
  checkIn: async (data: AttendanceCheckInForm): Promise<Attendance> => {
    try {
      const response = await legacyFetch('/attendance/check-in/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  checkOut: async (data: AttendanceCheckOutForm): Promise<Attendance> => {
    try {
      const response = await legacyFetch('/attendance/check-out/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Precheck
  precheckAttendance: async (): Promise<{
    can_check_in: boolean
    can_check_out: boolean
    message?: string
  }> => {
    try {
      const response = await legacyFetch('/attendance/precheck/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Today's attendance
  getTodayAttendance: async (): Promise<Attendance | null> => {
    try {
      const response = await legacyFetch('/attendance/today/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Summary
  getAttendanceSummary: async (filters?: DateRangeFilter): Promise<{
    total_days: number
    present_days: number
    absent_days: number
    late_days: number
    total_work_hours: number
    total_overtime_hours: number
    total_lateness_minutes: number
  }> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }

      const response = await legacyFetch(`/attendance/summary/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Report
  getAttendanceReport: async (filters?: DateRangeFilter): Promise<Attendance[]> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }

      const response = await legacyFetch(`/attendance/report/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // PDF Report
  getAttendanceReportPdf: async (filters?: DateRangeFilter): Promise<Blob> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }

      const response = await legacyFetch(`/attendance/report/pdf/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.blob()
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

// Corrections API client
export const correctionsApi = {
  getCorrections: async (filters?: PaginationFilter): Promise<ApiResponse<AttendanceCorrection>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }

      const response = await legacyFetch(`/corrections/corrections/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getCorrection: async (id: number): Promise<AttendanceCorrection> => {
    try {
      const response = await legacyFetch(`/corrections/corrections/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createCorrection: async (data: CorrectionRequestForm): Promise<AttendanceCorrection> => {
    try {
      const response = await legacyFetch('/corrections/corrections/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMyCorrections: async (): Promise<ApiResponse<AttendanceCorrection>> => {
    try {
      const response = await legacyFetch('/corrections/my-corrections/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getPendingCorrections: async (): Promise<ApiResponse<AttendanceCorrection>> => {
    try {
      const response = await legacyFetch('/corrections/pending/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Approval actions
  approveCorrection: async (id: number, decisionNote?: string): Promise<AttendanceCorrection> => {
    try {
      const response = await legacyFetch(`/corrections/corrections/${id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_note: decisionNote })
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  rejectCorrection: async (id: number, decisionNote?: string): Promise<AttendanceCorrection> => {
    try {
      const response = await legacyFetch(`/corrections/corrections/${id}/reject/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_note: decisionNote })
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

export default { attendanceApi, correctionsApi }
