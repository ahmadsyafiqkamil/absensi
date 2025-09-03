import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const meResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!meResponse.ok) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const userData = await meResponse.json();
    const isAdmin = userData.groups?.includes('admin') || userData.is_superuser;

    if (!isAdmin) {
      return NextResponse.json({ detail: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch positions from backend (namespaced admin route)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/admin/positions/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch positions');
    }

    const positions = await response.json();
    return NextResponse.json(positions);

  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    // Verify admin
    const meResponse = await fetch(`${backendBase}/api/auth/me`, {
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

    const body = await req.json().catch(() => ({}));
    const resp = await fetch(`${backendBase}/api/admin/positions/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ name: body.name })
    });
    const data = await resp.json().catch(() => ({}));
    return NextResponse.json(data, { status: resp.status });
  } catch (error) {
    console.error('Error creating position:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
