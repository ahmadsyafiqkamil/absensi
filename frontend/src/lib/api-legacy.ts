import { v2Fetch, getV2Url } from './backend'
import type {
  ApiResponse,
  ApiError,
  Division,
  Position,
  Employee,
  WorkSettings,
  Holiday,
  Attendance,
  AttendanceCorrection,
  OvertimeRequest,
  MonthlySummaryRequest,
  ReportTemplate,
  GeneratedReport,
  ReportSchedule,
  ReportAccessLog,
  EmployeeFilter,
  AttendanceFilter,
  DateRangeFilter,
  CorrectionRequestForm,
  OvertimeRequestForm,
  AttendanceCheckInForm,
  AttendanceCheckOutForm,
  PaginationFilter
} from './types'

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

// Employee Management API
export const employeeApi = {
  // Divisions
  getDivisions: async (): Promise<ApiResponse<Division>> => {
    try {
      const response = await legacyFetch('/api/employees/divisions/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getDivision: async (id: number): Promise<Division> => {
    try {
      const response = await legacyFetch(`/employees/divisions/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Positions
  getPositions: async (): Promise<ApiResponse<Position>> => {
    try {
      const response = await legacyFetch('/employees/positions/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getPosition: async (id: number): Promise<Position> => {
    try {
      const response = await legacyFetch(`/employees/positions/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Employees
  getEmployees: async (filters?: EmployeeFilter): Promise<ApiResponse<Employee>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }
      
      const response = await legacyFetch(`/employees/employees/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getEmployee: async (id: number): Promise<Employee> => {
    try {
      const response = await legacyFetch(`/employees/employees/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMyProfile: async (): Promise<Employee> => {
    try {
      // Use legacy endpoint since this is where our employee_me view is defined
      const response = await legacyFetch('/employees/me', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
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

// Settings API
export const settingsApi = {
  // Work Settings
  getWorkSettings: async (): Promise<WorkSettings> => {
    try {
      const response = await legacyFetch('/settings/work/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateWorkSettings: async (data: Partial<WorkSettings>): Promise<WorkSettings> => {
    try {
      const response = await legacyFetch('/settings/work/', {
        method: 'PATCH',
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

  // Holidays
  getHolidays: async (): Promise<ApiResponse<Holiday>> => {
    try {
      const response = await legacyFetch('/settings/holidays/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getHoliday: async (id: number): Promise<Holiday> => {
    try {
      const response = await legacyFetch(`/settings/holidays/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createHoliday: async (data: Omit<Holiday, 'id' | 'created_at' | 'updated_at'>): Promise<Holiday> => {
    try {
      const response = await legacyFetch('/settings/holidays/', {
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

  updateHoliday: async (id: number, data: Partial<Holiday>): Promise<Holiday> => {
    try {
      const response = await legacyFetch(`/settings/holidays/${id}/`, {
        method: 'PATCH',
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

  deleteHoliday: async (id: number): Promise<void> => {
    try {
      const response = await legacyFetch(`/settings/holidays/${id}/`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

// Attendance API
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
  precheckAttendance: async (): Promise<{ can_check_in: boolean; can_check_out: boolean; message?: string }> => {
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
  }
}

// Corrections API
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

  approveCorrection: async (id: number, approved: boolean, rejection_reason?: string): Promise<AttendanceCorrection> => {
    try {
      const response = await legacyFetch(`/corrections/corrections/${id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejection_reason })
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

// Overtime API
export const overtimeApi = {
  // Overtime requests
  getOvertimeRequests: async (filters?: PaginationFilter): Promise<ApiResponse<OvertimeRequest>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }
      
      const response = await legacyFetch(`/overtime/overtime/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOvertimeRequest: async (id: number): Promise<OvertimeRequest> => {
    try {
      const response = await legacyFetch(`/overtime/overtime/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createOvertimeRequest: async (data: OvertimeRequestForm): Promise<OvertimeRequest> => {
    try {
      const response = await legacyFetch('/overtime/overtime/', {
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

  getMyOvertime: async (): Promise<ApiResponse<OvertimeRequest>> => {
    try {
      const response = await legacyFetch('/overtime/my-overtime/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getPendingOvertime: async (): Promise<ApiResponse<OvertimeRequest>> => {
    try {
      const response = await legacyFetch('/overtime/pending/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  approveOvertime: async (id: number, approved: boolean, rejection_reason?: string): Promise<OvertimeRequest> => {
    try {
      const response = await legacyFetch(`/overtime/overtime/${id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejection_reason })
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

  // Monthly summary requests
  getMonthlySummaryRequests: async (filters?: PaginationFilter): Promise<ApiResponse<MonthlySummaryRequest>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }
      
      const response = await legacyFetch(`/overtime/monthly-summary/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getMonthlySummaryRequest: async (id: number): Promise<MonthlySummaryRequest> => {
    try {
      const response = await legacyFetch(`/overtime/monthly-summary/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createMonthlySummaryRequest: async (data: Omit<MonthlySummaryRequest, 'id' | 'created_at' | 'updated_at'>): Promise<MonthlySummaryRequest> => {
    try {
      const response = await legacyFetch('/overtime/monthly-summary/', {
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

  getMySummaries: async (): Promise<ApiResponse<MonthlySummaryRequest>> => {
    try {
      const response = await legacyFetch('/overtime/my-summaries/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getPendingSummaries: async (): Promise<ApiResponse<MonthlySummaryRequest>> => {
    try {
      const response = await legacyFetch('/overtime/pending/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  approveMonthlySummary: async (id: number, approved: boolean, rejection_reason?: string): Promise<MonthlySummaryRequest> => {
    try {
      const response = await legacyFetch(`/overtime/monthly-summary/${id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, rejection_reason })
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

// Reporting API
export const reportingApi = {
  // Report templates
  getReportTemplates: async (): Promise<ApiResponse<ReportTemplate>> => {
    try {
      const response = await legacyFetch('/reporting/templates/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getReportTemplate: async (id: number): Promise<ReportTemplate> => {
    try {
      const response = await legacyFetch(`/reporting/templates/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Generated reports
  getGeneratedReports: async (filters?: PaginationFilter): Promise<ApiResponse<GeneratedReport>> => {
    try {
      const params = new URLSearchParams()
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value))
        })
      }
      
      const response = await legacyFetch(`/reporting/reports/?${params.toString()}`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getGeneratedReport: async (id: number): Promise<GeneratedReport> => {
    try {
      const response = await legacyFetch(`/reporting/reports/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Report generation
  generateAttendanceReport: async (filters: DateRangeFilter & { division_id?: number }): Promise<GeneratedReport> => {
    try {
      const response = await legacyFetch('/reporting/generate/attendance/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
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

  generateOvertimeReport: async (filters: DateRangeFilter & { division_id?: number }): Promise<GeneratedReport> => {
    try {
      const response = await legacyFetch('/reporting/generate/overtime/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
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

  generateSummaryReport: async (filters: { month: number; year: number; division_id?: number }): Promise<GeneratedReport> => {
    try {
      const response = await legacyFetch('/reporting/generate/summary/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
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

  // Report download
  downloadReport: async (id: number): Promise<Blob> => {
    try {
      const response = await legacyFetch(`/reporting/reports/${id}/download/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.blob()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Report schedules
  getReportSchedules: async (): Promise<ApiResponse<ReportSchedule>> => {
    try {
      const response = await legacyFetch('/reporting/schedules/')
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getReportSchedule: async (id: number): Promise<ReportSchedule> => {
    try {
      const response = await legacyFetch(`/reporting/schedules/${id}/`)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createReportSchedule: async (data: Omit<ReportSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<ReportSchedule> => {
    try {
      const response = await legacyFetch('/reporting/schedules/', {
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

  updateReportSchedule: async (id: number, data: Partial<ReportSchedule>): Promise<ReportSchedule> => {
    try {
      const response = await legacyFetch(`/reporting/schedules/${id}/`, {
        method: 'PATCH',
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

  deleteReportSchedule: async (id: number): Promise<void> => {
    try {
      const response = await legacyFetch(`/reporting/schedules/${id}/`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
    } catch (error) {
      throw handleApiError(error)
    }
  }
}

// Admin Management API - NEW UNIFIED ROLE SYSTEM
export const adminApi = {
  // Roles Management (NEW)
  getRoles: async (filters?: any): Promise<ApiResponse<any[]>> => {
    try {
      let url = '/api/admin/roles/'
      if (filters) {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
        if (params.toString()) {
          url += `?${params.toString()}`
        }
      }
      const response = await legacyFetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  createRole: async (data: any): Promise<any> => {
    try {
      const response = await legacyFetch('/api/admin/roles/', {
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

  updateRole: async (id: number, data: any): Promise<any> => {
    try {
      const response = await legacyFetch(`/api/admin/roles/${id}/`, {
        method: 'PATCH',
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

  deleteRole: async (id: number): Promise<void> => {
    try {
      const response = await legacyFetch(`/api/admin/roles/${id}/`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
    } catch (error) {
      throw handleApiError(error)
    }
  },

  toggleRoleActive: async (id: number): Promise<any> => {
    try {
      const response = await legacyFetch(`/api/admin/roles/${id}/toggle_active/`, {
        method: 'POST'
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

  // Employee Roles Management
  getEmployeeRoles: async (filters?: any): Promise<ApiResponse<any[]>> => {
    try {
      let url = '/api/admin/employee-roles/'
      if (filters) {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, String(value))
          }
        })
        if (params.toString()) {
          url += `?${params.toString()}`
        }
      }
      const response = await legacyFetch(url)
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  assignEmployeeRole: async (data: any): Promise<any> => {
    try {
      const response = await legacyFetch('/api/admin/employee-roles/', {
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

  updateEmployeeRole: async (id: number, data: any): Promise<any> => {
    try {
      const response = await legacyFetch(`/api/admin/employee-roles/${id}/`, {
        method: 'PATCH',
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

  removeEmployeeRole: async (id: number): Promise<void> => {
    try {
      const response = await legacyFetch(`/api/admin/employee-roles/${id}/`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }
    } catch (error) {
      throw handleApiError(error)
    }
  },

  setPrimaryRole: async (id: number): Promise<any> => {
    try {
      const response = await legacyFetch(`/api/admin/employee-roles/${id}/set_primary/`, {
        method: 'POST'
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

  // DEPRECATED: Legacy role-configurations API (for backward compatibility)
  getRoleConfigurations: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await legacyFetch('/api/admin/role-configurations/')
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

// Export all APIs
export const api = {
  employees: employeeApi,
  settings: settingsApi,
  attendance: attendanceApi,
  corrections: correctionsApi,
  overtime: overtimeApi,
  reporting: reportingApi,
  admin: adminApi
}
