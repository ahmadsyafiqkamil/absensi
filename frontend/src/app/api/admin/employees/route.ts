import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const meResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'}/api/auth/me`, {
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
      gaji_pokok, 
      tmt_kerja, 
      tempat_lahir, 
      tanggal_lahir, 
      fullname 
    } = body;

    // Validate required fields
    if (!user_id || !nip) {
      return NextResponse.json(
        { detail: 'User ID and NIP are required' },
        { status: 400 }
      );
    }

    // Prepare employee data
    const employeeData: any = {
      user_id,
      nip,
      division_id: division_id || null,
      position_id: position_id || null,
    };

    // Add optional fields if provided
    if (gaji_pokok !== undefined && gaji_pokok !== null) {
      employeeData.gaji_pokok = gaji_pokok;
    }
    if (tmt_kerja !== undefined && tmt_kerja !== null) {
      employeeData.tmt_kerja = tmt_kerja;
    }
    if (tempat_lahir !== undefined && tempat_lahir !== null) {
      employeeData.tempat_lahir = tempat_lahir;
    }
    if (tanggal_lahir !== undefined && tanggal_lahir !== null) {
      employeeData.tanggal_lahir = tanggal_lahir;
    }
    if (fullname !== undefined && fullname !== null) {
      employeeData.fullname = fullname;
    }

    // Call backend employee creation API (namespaced admin route)
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000'}/api/admin/employees/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(employeeData)
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

export async function GET() {
  try {
    const accessToken = (await cookies()).get('access_token')?.value;
    if (!accessToken) {
      return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://backend:8000';

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

    // Fetch employees from backend (namespaced admin route)
    const response = await fetch(`${backendBase}/api/admin/employees/`, {
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


