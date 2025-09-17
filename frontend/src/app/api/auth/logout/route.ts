import { NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers'

function clearAuthCookies(res: NextResponse) {
  const past = new Date(0)
  res.cookies.set('access_token', '', { expires: past, path: '/' })
  res.cookies.set('refresh_token', '', { expires: past, path: '/' })
}

export async function GET(request: Request) {
  const url = new URL('/login', request.url)
  const res = NextResponse.redirect(url)
  clearAuthCookies(res)
  return res
}

export async function POST(request: Request) {
  try {
    // Call V2 logout endpoint if user is authenticated
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    
    if (accessToken) {
      const backend = getBackendUrl()
      await fetch(`${backend}/api/v2/auth/logout/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      })
    }
  } catch (error) {
    console.error('Logout API call failed:', error)
    // Continue with local logout even if API call fails
  }
  
  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}


