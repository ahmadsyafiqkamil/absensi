import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies: Record<string, string> = {};
    
    // Get all cookies
    cookieStore.getAll().forEach(cookie => {
      allCookies[cookie.name] = cookie.value;
    });

    // Get specific cookies
    const accessToken = cookieStore.get('access_token')?.value;
    const clientAccessToken = cookieStore.get('client_access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    return NextResponse.json({
      message: 'Cookie debug info',
      cookies: {
        all: allCookies,
        access_token: accessToken ? 'present' : 'missing',
        client_access_token: clientAccessToken ? 'present' : 'missing', 
        refresh_token: refreshToken ? 'present' : 'missing'
      },
      headers: {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization')
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to read cookies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
