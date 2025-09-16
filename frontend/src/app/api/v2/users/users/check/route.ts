import { NextRequest, NextResponse } from 'next/server'
import { proxyToBackend } from '@/lib/backend'

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    
    // Proxy to backend v2 users check endpoint
    const response = await proxyToBackend(request, `users/users/check?${queryString}`, {
      method: 'GET',
    })
    
    return response
  } catch (error) {
    console.error('Check username API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
