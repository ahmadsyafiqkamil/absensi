import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { username, password, email, group } = body;

    // Validate required fields
    if (!username || !group) {
      return NextResponse.json(
        { detail: 'Username and group are required' },
        { status: 400 }
      );
    }

    // Validate group values
    const validGroups = ['admin', 'supervisor', 'pegawai'];
    if (!validGroups.includes(group)) {
      return NextResponse.json(
        { detail: 'Invalid group. Must be one of: admin, supervisor, pegawai' },
        { status: 400 }
      );
    }

    // Call backend provision API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/users/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        username,
        password: password || '1', // Default password if not provided
        email: email || '',
        group
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error provisioning user:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
