import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    console.log('Debug login - Request body:', body)
    
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    const url = `${backendUrl}/api/auth/login`
    console.log('Debug login - Backend URL:', url)
    
    // Test direct fetch to backend
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: body.username, password: body.password }),
      cache: 'no-store'
    })
    
    console.log('Debug login - Response status:', resp.status)
    console.log('Debug login - Response headers:', Object.fromEntries(resp.headers.entries()))
    
    const data = await resp.json().catch(() => ({}))
    console.log('Debug login - Response data:', data)
    
    return NextResponse.json({
      success: true,
      backendUrl,
      url,
      responseStatus: resp.status,
      responseData: data,
      responseHeaders: Object.fromEntries(resp.headers.entries())
    })
    
  } catch (error) {
    console.error('Debug login error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
