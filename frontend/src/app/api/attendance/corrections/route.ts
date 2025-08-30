import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { detail: 'Authorization header not found or invalid' },
        { status: 401 }
      );
    }
    
    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    // Build backend URL with parameters
    // Use Docker internal networking for container-to-container communication
    const backendUrl = new URL('/api/attendance/corrections', 'http://backend:8000');
    
    if (month) {
      backendUrl.searchParams.append('month', month);
    } else {
      if (startDate) backendUrl.searchParams.append('start_date', startDate);
      if (endDate) backendUrl.searchParams.append('end_date', endDate);
    }
    
    if (status && status !== 'all') {
      backendUrl.searchParams.append('status', status);
    }

    // Forward request to backend
    const response = await fetch(backendUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { detail: errorData.detail || 'Backend request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in corrections API:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
