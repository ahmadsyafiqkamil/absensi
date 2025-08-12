import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const access = req.cookies.get('access_token')?.value
  const isLogin = req.nextUrl.pathname.startsWith('/login')
  if (!access && !isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  if (access && isLogin) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/', '/dashboard/:path*', '/login'] }


