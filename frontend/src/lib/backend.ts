// Centralized backend URL configuration
export const getBackendBaseUrl = () => {
  // Use different URLs for server vs client in Docker environment
  if (typeof window === 'undefined') {
    // Server-side (API routes): use container-to-container networking
    return process.env.BACKEND_URL || 'http://backend:8000'
  } else {
    // Client-side (browser): use host networking
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  }
}

// Runtime URL determination - this will work correctly for both server and client
export const getBackendUrl = () => {
  // Use different URLs for server vs client in Docker environment
  if (typeof window === 'undefined') {
    // Server-side (API routes): use container-to-container networking
    return process.env.BACKEND_URL || 'http://backend:8000'
  } else {
    // Client-side (browser): use host networking
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
  }
}

// For backward compatibility - this will be set at runtime when called
export const BACKEND_BASE_URL = getBackendUrl()

// API version configuration
export const API_VERSIONS = {
  LEGACY: '/api',
  V2: '/api/v2'
} as const

export type ApiVersion = keyof typeof API_VERSIONS

function joinUrl(path: string, version: ApiVersion = 'LEGACY') {
  const basePath = API_VERSIONS[version]
  const backendUrl = getBackendBaseUrl()
  return `${backendUrl}${basePath}${path.startsWith('/') ? path : `/${path}`}`
}

// Enhanced backend fetch with retry and error handling
export async function backendFetch(
  path: string,
  init?: RequestInit,
  version: ApiVersion = 'LEGACY'
): Promise<Response> {
  const url = joinUrl(path, version);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Backend Fetch] Attempt ${attempt}/${maxRetries} to ${url}`);

      const response = await fetch(url, {
        ...init,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers,
        },
      });

      if (!response.ok) {
        console.warn(`[Backend Fetch] HTTP ${response.status} for ${url}`);
        throw new Error(`Backend responded with status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`[Backend Fetch] Attempt ${attempt} failed:`, error);

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw new Error('Max retries exceeded');
}

// Legacy API functions (updated to use v2)
export async function loginRequest(username: string, password: string) {
  const backendUrl = getBackendBaseUrl()
  const url = `${backendUrl}/api/v2/users/auth/login`
  
  console.log('v2 Login request to:', url);
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store'
  })
  
  console.log('v2 Login response status:', resp.status);
  console.log('v2 Login response headers:', Object.fromEntries(resp.headers.entries()));
  
  const data = await resp.json().catch((error) => {
    console.error('Failed to parse JSON:', error);
    return {};
  })
  
  console.log('v2 Login response data:', data);
  return { resp, data }
}

export async function meRequest(accessToken: string) {
  // Updated to use v2 API endpoint
  const resp = await backendFetch('/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, 'V2')
  const data = await resp.json().catch(() => ({}))
  return { resp, data }
}

// Server-only: reads access_token from cookies (v2)
export async function meFromServerCookies() {
  const { cookies } = await import('next/headers')
  const token = (await cookies()).get('access_token')?.value
  if (!token) return { resp: new Response(null, { status: 401 }), data: {} }
  return meRequest(token)
}

// New V2 API functions
export async function v2Fetch(path: string, init?: RequestInit) {
  return backendFetch(path, init, 'V2')
}

// Helper function to get full backend URL for V2 endpoints
export function getV2Url(path: string) {
  return joinUrl(path, 'V2')
}

// V2 API Client - Comprehensive functions for all v2 endpoints
export const v2Api = {
  // Core API
  core: {
    health: async () => {
      const response = await v2Fetch('/core/health')
      return await response.json()
    }
  },

  // Users & Authentication API
  users: {
    me: async () => {
      const response = await v2Fetch('/users/me')
      return await response.json()
    },
    
    login: async (credentials: { username: string; password: string }) => {
      const response = await v2Fetch('/users/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      })
      return await response.json()
    },

    refresh: async (refreshToken: string) => {
      const response = await v2Fetch('/users/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken })
      })
      return await response.json()
    },

    logout: async () => {
      const response = await v2Fetch('/users/logout', { method: 'POST' })
      return await response.json()
    },

    check: async (username: string) => {
      const response = await v2Fetch(`/users/check?username=${encodeURIComponent(username)}`)
      return await response.json()
    },

    getGroups: async () => {
      const response = await v2Fetch('/users/groups')
      return await response.json()
    },

    getUsersList: async () => {
      const response = await v2Fetch('/users/list')
      return await response.json()
    },

    getCsrfToken: async () => {
      const response = await v2Fetch('/users/csrf-token')
      return await response.json()
    }
  },

  // Employees API
  employees: {
    getEmployees: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/employees/employees${params}`)
      return await response.json()
    },

    getEmployee: async (id: number) => {
      const response = await v2Fetch(`/employees/employees/${id}`)
      return await response.json()
    },

    getDivisions: async () => {
      const response = await v2Fetch('/employees/divisions')
      return await response.json()
    },

    getPositions: async () => {
      const response = await v2Fetch('/employees/positions')
      return await response.json()
    }
  },

  // Attendance API
  attendance: {
    getAttendance: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/attendance/attendance${params}`)
      return await response.json()
    },

    getAttendanceById: async (id: number) => {
      const response = await v2Fetch(`/attendance/attendance/${id}`)
      return await response.json()
    },

    // Supervisor functions
    getSupervisorTeamAttendance: async () => {
      const response = await v2Fetch('/attendance/supervisor/team-attendance')
      return await response.json()
    },

    getSupervisorAttendanceDetail: async (employeeId: number) => {
      const response = await v2Fetch(`/attendance/supervisor/attendance-detail/${employeeId}`)
      return await response.json()
    },

    getSupervisorTeamAttendancePdf: async () => {
      const response = await v2Fetch('/attendance/supervisor/team-attendance/pdf')
      return response // Return response directly for blob handling
    },

    approveOvertimeByAttendance: async (attendanceId: number) => {
      const response = await v2Fetch(`/attendance/attendance/${attendanceId}/approve_overtime`, {
        method: 'POST'
      })
      return await response.json()
    }
  },

  // Overtime API
  overtime: {
    getOvertimeRequests: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/overtime/overtime${params}`)
      return await response.json()
    },

    getOvertimeRequest: async (id: number) => {
      const response = await v2Fetch(`/overtime/overtime/${id}`)
      return await response.json()
    },

    createOvertimeRequest: async (data: any) => {
      const response = await v2Fetch('/overtime/overtime', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    approveOvertimeRequest: async (id: number, data: { approved: boolean; rejection_reason?: string }) => {
      const response = await v2Fetch(`/overtime/overtime/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    // Monthly Summary API
    getMonthlySummaryRequests: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/overtime/monthly-summary${params}`)
      return await response.json()
    },

    getMonthlySummaryRequest: async (id: number) => {
      const response = await v2Fetch(`/overtime/monthly-summary/${id}`)
      return await response.json()
    },

    createMonthlySummaryRequest: async (data: any) => {
      const response = await v2Fetch('/overtime/monthly-summary', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    approveMonthlySummaryRequest: async (id: number, data: { approved: boolean; rejection_reason?: string }) => {
      const response = await v2Fetch(`/overtime/monthly-summary/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    // Export functions
    exportMonthlyPdf: async (month: string) => {
      const response = await v2Fetch(`/overtime/overtime/export_monthly_pdf?month=${encodeURIComponent(month)}`)
      return response // Return response directly for blob handling
    },

    exportListPdf: async () => {
      const response = await v2Fetch('/overtime/overtime/export_list_pdf')
      return response // Return response directly for blob handling
    },

    exportMonthlyDocx: async (month: string) => {
      const response = await v2Fetch(`/overtime/monthly-summary/export_monthly_docx?month=${encodeURIComponent(month)}`)
      return response // Return response directly for blob handling
    },

    // Template management
    uploadMonthlyExportTemplate: async (file: File) => {
      const formData = new FormData()
      formData.append('template_file', file)
      const response = await v2Fetch('/overtime/monthly-summary/upload_monthly_export_template', {
        method: 'POST',
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      })
      return await response.json()
    },

    reloadMonthlyExportTemplate: async () => {
      const response = await v2Fetch('/overtime/monthly-summary/reload_monthly_export_template', {
        method: 'POST'
      })
      return await response.json()
    }
  },

  // Settings API
  settings: {
    getWorkSettings: async () => {
      const response = await v2Fetch('/settings/work-settings')
      return await response.json()
    },

    updateWorkSettings: async (data: any) => {
      const response = await v2Fetch('/settings/work-settings', {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    getHolidays: async () => {
      const response = await v2Fetch('/settings/holidays')
      return await response.json()
    },

    getHoliday: async (id: number) => {
      const response = await v2Fetch(`/settings/holidays/${id}`)
      return await response.json()
    },

    createHoliday: async (data: any) => {
      const response = await v2Fetch('/settings/holidays', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    updateHoliday: async (id: number, data: any) => {
      const response = await v2Fetch(`/settings/holidays/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    deleteHoliday: async (id: number) => {
      const response = await v2Fetch(`/settings/holidays/${id}`, {
        method: 'DELETE'
      })
      return response.ok
    }
  },

  // Corrections API
  corrections: {
    getCorrections: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/corrections/corrections${params}`)
      return await response.json()
    },

    getCorrection: async (id: number) => {
      const response = await v2Fetch(`/corrections/corrections/${id}`)
      return await response.json()
    },

    createCorrection: async (data: any) => {
      const response = await v2Fetch('/corrections/corrections', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    approveCorrection: async (id: number, data: { approved: boolean; rejection_reason?: string }) => {
      const response = await v2Fetch(`/corrections/corrections/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    }
  },

  // Reporting API
  reporting: {
    getReports: async (filters?: Record<string, any>) => {
      const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
      const response = await v2Fetch(`/reporting/reports${params}`)
      return await response.json()
    },

    getReport: async (id: number) => {
      const response = await v2Fetch(`/reporting/reports/${id}`)
      return await response.json()
    },

    generateReport: async (data: any) => {
      const response = await v2Fetch('/reporting/reports', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return await response.json()
    },

    downloadReport: async (id: number) => {
      const response = await v2Fetch(`/reporting/reports/${id}/download`)
      return response // Return response directly for blob handling
    }
  }
}

// Health check function to verify backend connectivity
export async function checkBackendHealth(): Promise<boolean> {
  try {
    // Use the main API endpoint as health check
    const response = await fetch(`${getBackendBaseUrl()}/api/`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error('[Health Check] Backend health check failed:', error);
    return false;
  }
}

// Utility function for API routes to proxy requests to backend
export async function proxyToBackend(
  request: Request,
  path: string,
  options: {
    method?: string;
    body?: any;
    queryParams?: URLSearchParams;
    version?: ApiVersion;
  } = {}
): Promise<Response> {
  const {
    method = 'GET',
    body,
    queryParams,
    version = 'LEGACY'
  } = options;

  try {
    // Build URL
    let url = joinUrl(path, version);
    if (queryParams) {
      url += `?${queryParams.toString()}`;
    }

    console.log(`[API Proxy] ${method} ${url}`);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward cookies for authentication
    const cookie = request.headers.get('cookie');
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    // Forward CSRF token if present
    const csrfToken = request.headers.get('x-csrftoken');
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
      cache: 'no-store',
    };

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      requestOptions.body = JSON.stringify(body);
    }

    // Make request to backend
    const response = await fetch(url, requestOptions);

    // Handle non-OK responses
    if (!response.ok) {
      console.warn(`[API Proxy] Backend returned ${response.status} for ${url}`);
      const errorText = await response.text();
      console.error(`[API Proxy] Error response:`, errorText);

      return new Response(errorText, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Forward successful response
    const responseData = await response.text();
    return new Response(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(response.headers.entries()),
      },
    });

  } catch (error) {
    console.error(`[API Proxy] Failed to proxy request to ${path}:`, error);

    // Check if it's a connection error
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return new Response(JSON.stringify({
        error: 'Backend connection failed',
        details: 'Unable to connect to backend service. Please ensure the backend is running.',
        code: 'ECONNREFUSED'
      }), {
        status: 503, // Service Unavailable
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}


