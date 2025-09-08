import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { username, password } = body
    
    console.log('Test login attempt:', { username, password })
    
    const backendUrl = 'http://172.20.0.1:8000'  // Use direct IP
    const url = `${backendUrl}/api/auth/login`
    
    console.log('Attempting to connect to:', url)
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      cache: 'no-store'
    })
    
    console.log('Response status:', resp.status)
    
    const data = await resp.json().catch(() => ({}))
    console.log('Response data:', data)
    
    return NextResponse.json({ 
      success: true, 
      status: resp.status, 
      data,
      backendUrl,
      url
    })
    
  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
