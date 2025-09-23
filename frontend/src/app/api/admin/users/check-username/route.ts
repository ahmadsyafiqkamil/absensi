import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ detail: 'Username parameter is required' }, { status: 400 });
    }

    // Check username availability by calling backend (no auth required)
    const response = await fetch(`${getBackendUrl()}/api/v2/users/users/check_username/?username=${encodeURIComponent(username)}`);

    if (!response.ok) {
      // If backend returns 404, username is available
      if (response.status === 404) {
        return NextResponse.json({ available: true });
      }
      return NextResponse.json({ detail: 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
