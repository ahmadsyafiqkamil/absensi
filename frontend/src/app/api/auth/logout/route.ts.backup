import { NextResponse } from 'next/server'

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
  const res = NextResponse.json({ ok: true })
  clearAuthCookies(res)
  return res
}


