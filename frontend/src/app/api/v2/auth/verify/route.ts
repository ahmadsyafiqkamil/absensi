import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend v2 verify endpoint
    const response = await proxyToBackend(request, 'auth/verify/', {
      method: 'POST',
      body,
    })
    
    return response
  } catch (error) {
    console.error('Verify API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
