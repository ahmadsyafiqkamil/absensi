/**
 * Utility functions for backend API calls
 * Centralized configuration for consistent backend communication
 */

import { proxyToBackend } from './backend';

/**
 * Get backend URL for API routes (server-side)
 */
export function getBackendUrl(): string {
  // For server-side API routes, use container-to-container networking
  return process.env.BACKEND_URL || 'http://backend:8000';
}

/**
 * Get backend URL for client-side (browser)
 */
export function getClientBackendUrl(): string {
  // For client-side, use localhost (through Caddy proxy)
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
}

/**
 * Standardized API call function for API routes
 */
export async function apiRequest(
  request: Request,
  path: string,
  options: {
    method?: string;
    body?: any;
    queryParams?: URLSearchParams;
  } = {}
): Promise<Response> {
  return proxyToBackend(request, path, options);
}

/**
 * Create a standardized fetch call for server-side API routes
 */
export async function serverFetch(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    requireAuth?: boolean;
  } = {}
): Promise<Response> {
  const backendUrl = getBackendUrl();
  const url = `${backendUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body && options.method !== 'GET') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  return fetch(url, fetchOptions);
}

/**
 * Get user authentication info from request
 */
export async function getAuthFromRequest(request: Request): Promise<{
  accessToken: string | null;
  isAuthenticated: boolean;
}> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return { accessToken: null, isAuthenticated: false };
  }

  const cookies = cookieHeader.split(';').map(c => c.trim());
  const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));

  if (!accessTokenCookie) {
    return { accessToken: null, isAuthenticated: false };
  }

  const accessToken = accessTokenCookie.split('=')[1];
  return {
    accessToken,
    isAuthenticated: !!accessToken
  };
}

/**
 * Check if user is admin by calling backend auth/me endpoint
 */
export async function checkAdminAccess(request: Request): Promise<boolean> {
  try {
    const { accessToken } = await getAuthFromRequest(request);
    if (!accessToken) return false;

    const response = await serverFetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) return false;

    const userData = await response.json();
    return userData.groups?.includes('admin') || userData.is_superuser || false;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}
