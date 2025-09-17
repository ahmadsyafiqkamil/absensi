import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend v2 employee me endpoint
    const response = await proxyToBackend(request, 'auth/employee/me/', {
      method: 'GET',
    })
    
    return response
  } catch (error) {
    console.error('Employee me API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
