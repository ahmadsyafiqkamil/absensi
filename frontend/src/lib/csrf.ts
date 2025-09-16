/**
 * Enhanced utility functions for handling CSRF tokens
 */

let csrfToken: string | null = null;

/**
 * Get CSRF token from cookies or fetch from backend
 */
export async function getCSRFToken(): Promise<string> {
  // Always check cookies first as they are most reliable
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='));

  if (csrfCookie) {
    const token = csrfCookie.split('=')[1];
    if (token && token !== csrfToken) {
      csrfToken = token;
      console.log('CSRF token found in cookies:', token.substring(0, 10) + '...');
    }
    return csrfToken || '';
  }

  // If no token in cookies, try to fetch from backend
  console.log('No CSRF token in cookies, attempting to fetch...');
  try {
    const response = await fetch('/api/v2/auth/csrf-token/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const token = data.csrfToken || data.csrf_token || data.token || '';
      if (token) {
        csrfToken = token;
        console.log('CSRF token fetched successfully:', token.substring(0, 10) + '...');
        return token;
      }
    } else {
      console.warn('CSRF token fetch failed with status:', response.status);
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token from backend:', error);
  }

  // Fallback: try to get from meta tag
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    const content = metaTag.getAttribute('content') || '';
    if (content && content !== csrfToken) {
      csrfToken = content;
      console.log('CSRF token found in meta tag');
      return content;
    }
  }

  console.warn('No CSRF token available');
  return csrfToken || '';
}

/**
 * Clear stored CSRF token (useful for logout)
 */
export function clearCSRFToken(): void {
  csrfToken = null;
}

/**
 * Get headers with CSRF token for API requests
 */
export async function getCSRFHeaders(): Promise<HeadersInit> {
  const token = await getCSRFToken();
  
  return {
    'Content-Type': 'application/json',
    'X-CSRFToken': token,
  };
}

