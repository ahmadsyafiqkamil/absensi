import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const accessToken = (await cookies()).get('access_token')?.value;
  if (!accessToken) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const month = searchParams.get('month');
  const employeeId = searchParams.get('employee_id');
  const approvedOnly = searchParams.get('approved_only');
  const pendingOnly = searchParams.get('pending_only');

  // Build query string
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('start_date', startDate);
  if (endDate) queryParams.append('end_date', endDate);
  if (month) queryParams.append('month', month);
  if (employeeId) queryParams.append('employee_id', employeeId);
  if (approvedOnly) queryParams.append('approved_only', approvedOnly);
  if (pendingOnly) queryParams.append('pending_only', pendingOnly);

  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const url = `${backend}/api/overtime/report${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${accessToken}` 
      },
      cache: 'no-store',
    });

    const data = await resp.json().catch(() => ({}));
    
    if (!resp.ok) {
      return NextResponse.json(
        { detail: data.detail || 'Failed to fetch overtime report' }, 
        { status: resp.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching overtime report:', error);
    return NextResponse.json(
      { detail: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
