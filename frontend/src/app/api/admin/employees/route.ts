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

    // Call backend employee creation API (namespaced admin route)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/admin/employees-with-roles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
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
      const errorData = await response.json();
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

export async function GET(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = 'http://backend:8000';

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

    // Parse query parameters for advanced search
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    const search = searchParams.get('search') || '';
    const division = searchParams.get('division');
    const role = searchParams.get('role');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';

    // Build backend query parameters
    const backendParams = new URLSearchParams();
    backendParams.set('page', page);
    backendParams.set('page_size', pageSize);

    if (search) backendParams.set('search', search);
    if (division && division !== 'all') backendParams.set('division', division);
    if (role && role !== 'all') backendParams.set('role', role);
    if (sortBy) backendParams.set('ordering', `${sortOrder === 'desc' ? '-' : ''}${sortBy}`);

    // Fetch employees from backend with parameters
    const backendUrl = `${backendBase}/api/admin/employees-with-roles/?${backendParams.toString()}`;

    console.log('Fetching employees from:', backendUrl); // Debug log

    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend response error:', response.status, errorText);
      return NextResponse.json(
        { detail: `Backend error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Backend response data:', data); // Debug log

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { detail: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}


