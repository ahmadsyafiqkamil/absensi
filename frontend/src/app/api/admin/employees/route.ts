import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils'
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const meResponse = await fetch(`${getBackendUrl()}/api/v2/users/me`, {
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
    const { 
      user_id, 
      nip, 
      division_id, 
      position_id, 
      fullname, 
      gaji_pokok, 
      tmt_kerja, 
      tempat_lahir, 
      tanggal_lahir 
    } = body;

    // Validate required fields
    if (!user_id || !nip) {
      return NextResponse.json(
        { detail: 'User ID and NIP are required' },
        { status: 400 }
      );
    }

    // Call backend employee creation API (v2 route)
    const response = await fetch(`${getBackendUrl()}/api/v2/employees/employees/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-CSRFToken': (await cookies()).get('csrftoken')?.value || ''
      },
      body: JSON.stringify({
        user_id,
        nip,
        division_id: division_id === 'none' ? null : division_id,
        position_id: position_id === 'none' ? null : position_id,
        fullname: fullname || null,
        gaji_pokok: gaji_pokok || null,
        tmt_kerja: tmt_kerja || null,
        tempat_lahir: tempat_lahir || null,
        tanggal_lahir: tanggal_lahir || null,
      })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If response is not JSON (e.g., HTML error page), create a generic error
        errorData = { detail: `Server error: ${response.status} ${response.statusText}` };
      }
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = getBackendUrl();

    // Verify admin
    const meResponse = await fetch(`${backendBase}/api/v2/users/me`, {
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

    // Fetch employees from backend (v2 route)
    const response = await fetch(`${backendBase}/api/v2/employees/employees/`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ([]));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}


