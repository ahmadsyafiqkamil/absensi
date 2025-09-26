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

// For backward compatibility - this will be set at runtime when called
export const BACKEND_BASE_URL = getBackendBaseUrl()

// API version configuration
export const API_VERSIONS = {
  LEGACY: '/api',
  V2: '/api/v2'
} as const

export type ApiVersion = keyof typeof API_VERSIONS

function joinUrl(path: string, version: ApiVersion = 'V2') {
  const basePath = API_VERSIONS[version]
  const backendUrl = getBackendBaseUrl()
  return `${backendUrl}${basePath}${path.startsWith('/') ? path : `/${path}`}`
}

// Enhanced backend fetch with retry and error handling
export async function backendFetch(
  path: string,
  init?: RequestInit,
  version: ApiVersion = 'V2'
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
        credentials: init?.credentials || 'include', // Include cookies by default
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

// Legacy API functions (for backward compatibility)
export async function loginRequest(username: string, password: string) {
  const backendUrl = getBackendBaseUrl()
  const url = `${backendUrl}/api/v2/auth/login/`
  
  console.log('Login request to:', url);
  
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    cache: 'no-store'
  })
  
  console.log('Login response status:', resp.status);
  console.log('Login response headers:', Object.fromEntries(resp.headers.entries()));
  
  const data = await resp.json().catch((error) => {
    console.error('Failed to parse JSON:', error);
    return {};
  })
  
  console.log('Login response data:', data);
  return { resp, data }
}

export async function meRequest(accessToken: string) {
  const resp = await backendFetch('/auth/me/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  }, 'V2')
  const data = await resp.json().catch(() => ({}))
  return { resp, data }
}

// Server-only: reads access_token from cookies
export async function getAccessToken() {
  const { cookies } = await import('next/headers')
  return (await cookies()).get('access_token')?.value
}

// Server-only: reads access_token from cookies
export async function meFromServerCookies() {
  const token = await getAccessToken()
  if (!token) return { resp: new Response(null, { status: 401 }), data: {} }
  return meRequest(token)
}

// New V2 API functions
export async function v2Fetch(path: string, init?: RequestInit) {
  // For client-side requests, use JWT token from cookies
  const headers = { ...init?.headers } as Record<string, string>;
  
  // Get JWT token from cookies and add as Authorization header
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const accessTokenCookie = cookies.find(cookie => cookie.trim().startsWith('client_access_token='));
    if (accessTokenCookie) {
      const token = accessTokenCookie.split('=')[1];
      headers['Authorization'] = `Bearer ${token}`;
      console.log('[v2Fetch] Added JWT token to Authorization header');
    }
  }
  
  // For POST requests, get CSRF token if not already present
  if (init?.method === 'POST' && !headers['X-CSRFToken']) {
    try {
      const csrfResponse = await fetch(`${getBackendBaseUrl()}/api/v2/auth/csrf-token/`, {
        credentials: 'include'
      });
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        if (csrfData.csrfToken) {
          headers['X-CSRFToken'] = csrfData.csrfToken;
          console.log('[v2Fetch] Added CSRF token to request');
        }
      }
    } catch (error) {
      console.warn('[v2Fetch] Failed to get CSRF token:', error);
    }
  }
  
  // Add credentials to include cookies for authentication
  const requestInit: RequestInit = {
    ...init,
    headers,
    credentials: 'include', // Include cookies for authentication
  };
  
  return backendFetch(path, requestInit, 'V2')
}

// Helper function to get full backend URL for V2 endpoints
export function getV2Url(path: string) {
  return joinUrl(path, 'V2')
}

// Health check function to verify backend connectivity
export async function checkBackendHealth(): Promise<boolean> {
  try {
    // Use the V2 health endpoint
    const response = await fetch(`${getBackendBaseUrl()}/api/v2/auth/health/`, {
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
    version = 'V2'
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
    
    // For POST requests, try to get CSRF token if not present
    if (method === 'POST' && !csrfToken && cookie) {
      try {
        const csrfResponse = await fetch(`${getBackendBaseUrl()}/api/v2/auth/csrf-token/`, {
          headers: { 'Cookie': cookie }
        });
        if (csrfResponse.ok) {
          const csrfData = await csrfResponse.json();
          if (csrfData.csrfToken) {
            headers['X-CSRFToken'] = csrfData.csrfToken;
          }
        }
      } catch (error) {
        console.warn('[API Proxy] Failed to get CSRF token:', error);
      }
    }

    // Forward Authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else if (cookie) {
      // Extract JWT token from cookies and add as Authorization header
      const accessTokenMatch = cookie.match(/access_token=([^;]+)/);
      if (accessTokenMatch) {
        headers['Authorization'] = `Bearer ${accessTokenMatch[1]}`;
        console.log('[API Proxy] Added JWT token from cookie to Authorization header');
      }
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


