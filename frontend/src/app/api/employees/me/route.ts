import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { detail: 'Access token not found' },
        { status: 401 }
      )
    }

    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'
    const response = await fetch(`${backendUrl}/api/employees/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return NextResponse.json(
        error,
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in /api/employees/me:', error)
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    )
  }
}
