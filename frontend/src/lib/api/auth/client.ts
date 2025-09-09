/**
 * Authentication API Client
 * Handles authentication-related API calls
 */

import { ApiResponse, ApiError, User, Employee } from '@/lib/types'

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

// Authentication API client
export const authApi = {
  // User authentication
  login: async (username: string, password: string): Promise<{ access: string; refresh: string }> => {
    try {
      const response = await legacyFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

  // Refresh access token
  refresh: async (refreshToken: string): Promise<{ access: string }> => {
    try {
      const response = await legacyFetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
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

  // Verify access token
  verify: async (accessToken: string): Promise<{ detail: string }> => {
    try {
      const response = await legacyFetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
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

  // Get current user profile
  me: async (): Promise<User> => {
    try {
      const response = await legacyFetch('/api/auth/me')

      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }

      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Get current user employee profile
  employeeMe: async (): Promise<Employee> => {
    try {
      const response = await legacyFetch('/api/employees/me')

      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }

      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Logout user
  logout: async (): Promise<{ message: string }> => {
    try {
      const response = await legacyFetch('/api/auth/logout', {
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

  // User management (admin only)
  listUsers: async (): Promise<User[]> => {
    try {
      const response = await legacyFetch('/api/users')

      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }

      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Check if username exists
  checkUsername: async (username: string): Promise<{ username: string; exists: boolean }> => {
    try {
      const response = await legacyFetch(`/api/users/check?username=${encodeURIComponent(username)}`)

      if (!response.ok) {
        const error = await response.json()
        throw handleApiError(error)
      }

      return await response.json()
    } catch (error) {
      throw handleApiError(error)
    }
  },

  // Provision new user (dev/admin only)
  provisionUser: async (userData: {
    username: string
    password?: string
    email?: string
    group: 'admin' | 'supervisor' | 'pegawai'
  }): Promise<{ id: number; username: string; group: string; message: string }> => {
    try {
      const response = await legacyFetch('/api/users/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
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

export default authApi
