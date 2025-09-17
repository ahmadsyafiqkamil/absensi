import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend v2 users provision endpoint
    const response = await proxyToBackend(request, 'users/users/provision/', {
      method: 'POST',
      body,
    })
    
    return response
  } catch (error) {
    console.error('Provision user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
