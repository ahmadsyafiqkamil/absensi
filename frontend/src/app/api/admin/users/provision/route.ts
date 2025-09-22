import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    console.log('[API Route] User provision request started');
    
    // Get cookies for authentication
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    console.log('[API Route] Access token present:', !!accessToken);
    
    if (!accessToken) {
      return NextResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const { username, password, email, group } = body;
    
    console.log('[API Route] Provision request data:', { username, email, group });

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

    // Call backend directly with proper authentication
    const backendUrl = process.env.BACKEND_URL || 'http://backend:8000';
    const response = await fetch(`${backendUrl}/api/v2/users/users/provision/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        username,
        password: password || '1',
        email: email || '',
        group
      })
    });

    console.log('[API Route] Backend response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API Route] Backend error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: `Backend error: ${response.status} ${response.statusText}` };
      }
      
      return NextResponse.json(errorData, { status: response.status });
    }

    const result = await response.json();
    console.log('[API Route] Success:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[API Route] Error provisioning user:', error);
    return NextResponse.json(
      { 
        detail: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
