import { cookies } from 'next/headers'
import { getBackendUrl } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Get access token from cookies
    const accessToken = (await cookies()).get('access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
    }

    // Forward request to backend with authentication
    const backendUrl = getBackendUrl()
    const backendResponse = await fetch(`${backendUrl}/api/overtime-requests/reload-monthly-export-template`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const backendData = await backendResponse.json()

    if (!backendResponse.ok) {
      return NextResponse.json(backendData, { status: backendResponse.status })
    }

    return NextResponse.json(backendData)

  } catch (error) {
    console.error('Error reloading monthly export template:', error)
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
