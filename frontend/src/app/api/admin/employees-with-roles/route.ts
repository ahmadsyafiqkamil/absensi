import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils'

const BACKEND_URL = getBackendUrl();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = request.cookies.get('access_token')?.value;

    if (!token) {
      return NextResponse.json({ detail: 'No access token' }, { status: 401 });
    }

    const url = new URL(`${BACKEND_URL}/api/admin/employees-with-roles/`);
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Employees with roles API error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

