import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isJwtExpired(token: string | undefined): boolean {
  if (!token) return true
  const parts = token.split('.')
  if (parts.length < 2) return true
  try {
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '==='.slice((base64.length + 3) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { exp?: number }
    if (!payload.exp) return true
    const now = Math.floor(Date.now() / 1000)
    return payload.exp <= now
  } catch {
    return true
  }
}

export function middleware(req: NextRequest) {
  const access = req.cookies.get('access_token')?.value
  const isLogin = req.nextUrl.pathname.startsWith('/login')
  const expired = isJwtExpired(access)

  if ((expired || !access) && !isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (!expired && access && isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/', '/pegawai/:path*', '/login', '/admin/:path*', '/supervisor/:path*'] }


