/**
 * Enhanced utility function for making authenticated fetch requests
 * Automatically handles Authorization header, CSRF token, and credentials
 */

/**
 * Extract error message from API response
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json().catch(() => ({}));

    // Try different error message formats
    if (data.detail) return data.detail;
    if (data.message) return data.message;
    if (data.error) return data.error;
    if (data.non_field_errors && data.non_field_errors.length > 0) return data.non_field_errors[0];

    // Check for field-specific errors
    const fieldErrors = Object.values(data).filter(val =>
      Array.isArray(val) && val.length > 0
    ) as string[][];
    if (fieldErrors.length > 0) return fieldErrors[0][0];

    return `HTTP ${response.status}: ${response.statusText}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
}

/**
 * Check if response indicates an authentication error
 */
export function isAuthError(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}
export const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Get access token from cookies
    const cookies = document.cookie.split(';');
    const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('access_token='));
    const accessToken = accessTokenCookie ? accessTokenCookie.split('=')[1] : null;

    // Get CSRF token from cookies
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='));
    const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : null;

    // Prepare headers
    const headers: Record<string, string> = {
      ...options.headers as Record<string, string>,
    };

    // Add Authorization header if token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add CSRF token for non-GET requests (required by Django)
    if (options.method && options.method !== 'GET' && csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    // Ensure Content-Type is set for JSON requests, but not for FormData
    if (!headers['Content-Type'] && options.body) {
      // Don't set Content-Type for FormData (let browser set it automatically)
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // Make the request with credentials included
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies in request
    });

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401) {
      console.warn('Received 401, token might be expired');

      // Try to refresh token
      try {
        const refreshResponse = await fetch('/api/v2/auth/refresh/', {
          method: 'POST',
          credentials: 'include',
        });

        if (refreshResponse.ok) {
          console.log('Token refreshed successfully, retrying original request');

          // Retry the original request with new token
          const retryCookies = document.cookie.split(';');
          const newTokenCookie = retryCookies.find(cookie => cookie.trim().startsWith('access_token='));
          const newToken = newTokenCookie ? newTokenCookie.split('=')[1] : null;

          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, {
              ...options,
              headers,
              credentials: 'include',
            });
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    return response;
  } catch (error) {
    console.error('authFetch error:', error);

    // Create a more detailed error object
    const enhancedError = {
      originalError: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      url,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
    };

    throw enhancedError;
  }
};
