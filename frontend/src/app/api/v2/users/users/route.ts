import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend v2 users endpoint
    const response = await proxyToBackend(request, 'users/users/', {
      method: 'GET',
    })
    
    return response
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Proxy to backend v2 users endpoint
    const response = await proxyToBackend(request, 'users/users/', {
      method: 'POST',
      body,
    })
    
    return response
  } catch (error) {
    console.error('Create user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
