import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const backendBase = getBackendUrl();
    const meResponse = await fetch(`${backendBase}/api/v2/auth/me/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!meResponse.ok) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    const userData = await meResponse.json();
    const isAdmin = userData.groups?.includes('admin') || userData.is_superuser;
    if (!isAdmin) {
      return NextResponse.json({ detail: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch users list from backend
    const resp = await fetch(`${backendBase}/api/users`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await resp.json().catch(() => ([]));
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}


