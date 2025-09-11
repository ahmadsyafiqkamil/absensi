import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Helper functions for v2 API route proxying
 * Reduces boilerplate code and ensures consistent error handling
 */

export interface V2RouteOptions {
  requireAuth?: boolean
  method?: string
  body?: any
  headers?: Record<string, string>
  parseQuery?: boolean
}

/**
 * Generic v2 API proxy function
 * Handles authentication, error handling, and response forwarding
 */
export async function proxyToV2Api(
  request: Request, 
  v2Path: string, 
  options: V2RouteOptions = {}
): Promise<NextResponse> {
  const {
    requireAuth = true,
    method = 'GET',
    body,
    headers: customHeaders = {},
    parseQuery = true
  } = options

  try {
    // Handle authentication
    let authHeaders: Record<string, string> = {}
    if (requireAuth) {
      const accessToken = (await cookies()).get('access_token')?.value
      if (!accessToken) {
        return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
      }
      authHeaders = { 'Authorization': `Bearer ${accessToken}` }
    }

    // Parse query parameters if needed
    let queryString = ''
    if (parseQuery) {
      const { searchParams } = new URL(request.url)
      queryString = searchParams.toString()
      if (queryString) queryString = `?${queryString}`
    }

    // Build v2 API URL
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000'
    const fullUrl = `${backendUrl}/api/v2${v2Path}${queryString}`

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...customHeaders
      },
      cache: 'no-store'
    }

    // Add body for non-GET requests
    if (method !== 'GET' && body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    // Make request to v2 API
    const response = await fetch(fullUrl, requestOptions)
    
    // Handle response
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })

  } catch (error) {
    console.error(`v2 API proxy error for ${v2Path}:`, error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper for GET requests to v2 API
 */
export async function getFromV2Api(
  request: Request,
  v2Path: string,
  requireAuth = true
): Promise<NextResponse> {
  return proxyToV2Api(request, v2Path, { requireAuth, method: 'GET' })
}

/**
 * Helper for POST requests to v2 API
 */
export async function postToV2Api(
  request: Request,
  v2Path: string,
  body?: any,
  requireAuth = true
): Promise<NextResponse> {
  // If no body provided, try to parse from request
  if (!body) {
    try {
      body = await request.json()
    } catch {
      body = {}
    }
  }
  
  return proxyToV2Api(request, v2Path, { 
    requireAuth, 
    method: 'POST', 
    body,
    parseQuery: false 
  })
}

/**
 * Helper for PATCH requests to v2 API
 */
export async function patchToV2Api(
  request: Request,
  v2Path: string,
  body?: any,
  requireAuth = true
): Promise<NextResponse> {
  // If no body provided, try to parse from request
  if (!body) {
    try {
      body = await request.json()
    } catch {
      body = {}
    }
  }
  
  return proxyToV2Api(request, v2Path, { 
    requireAuth, 
    method: 'PATCH', 
    body,
    parseQuery: false 
  })
}

/**
 * Helper for DELETE requests to v2 API
 */
export async function deleteFromV2Api(
  request: Request,
  v2Path: string,
  requireAuth = true
): Promise<NextResponse> {
  return proxyToV2Api(request, v2Path, { 
    requireAuth, 
    method: 'DELETE',
    parseQuery: false 
  })
}

/**
 * Helper for handling file downloads (PDF, DOCX, etc.)
 * Returns the response directly for blob handling
 */
export async function downloadFromV2Api(
  request: Request,
  v2Path: string,
  requireAuth = true
): Promise<Response> {
  try {
    // Handle authentication
    let authHeaders: Record<string, string> = {}
    if (requireAuth) {
      const accessToken = (await cookies()).get('access_token')?.value
      if (!accessToken) {
        return new Response(JSON.stringify({ detail: 'Unauthorized' }), { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      authHeaders = { 'Authorization': `Bearer ${accessToken}` }
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const fullQueryString = queryString ? `?${queryString}` : ''

    // Build v2 API URL
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000'
    const fullUrl = `${backendUrl}/api/v2${v2Path}${fullQueryString}`

    // Make request to v2 API
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        ...authHeaders
      },
      cache: 'no-store'
    })

    // Return response directly for blob handling
    return response

  } catch (error) {
    console.error(`v2 API download error for ${v2Path}:`, error)
    return new Response(JSON.stringify({ detail: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Extract path parameters from Next.js dynamic routes
 * e.g., extractParams(params, ['id']) returns { id: params.id }
 */
export function extractParams(params: any, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  keys.forEach(key => {
    if (params[key]) {
      result[key] = params[key]
    }
  })
  return result
}
