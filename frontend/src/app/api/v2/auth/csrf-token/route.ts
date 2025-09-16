import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend v2 CSRF token endpoint
    const response = await proxyToBackend(request, 'auth/csrf-token/', {
      method: 'GET',
    })
    
    return response
  } catch (error) {
    console.error('CSRF token API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
