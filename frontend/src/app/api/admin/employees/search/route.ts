import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
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

    // Parse query parameters for advanced search
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    const query = searchParams.get('q') || '';
    const division = searchParams.get('division');
    const role = searchParams.get('role');
    const position = searchParams.get('position');
    const status = searchParams.get('status'); // active, inactive
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');

    // Build backend query parameters
    const backendParams = new URLSearchParams();
    backendParams.set('page', page.toString());
    backendParams.set('page_size', pageSize.toString());

    if (query) backendParams.set('search', query);
    if (division && division !== 'all') backendParams.set('division', division);
    if (role && role !== 'all') backendParams.set('role', role);
    if (position && position !== 'all') backendParams.set('position', position);
    if (status) backendParams.set('status', status);
    if (dateFrom) backendParams.set('date_from', dateFrom);
    if (dateTo) backendParams.set('date_to', dateTo);
    if (sortBy) backendParams.set('ordering', `${sortOrder === 'desc' ? '-' : ''}${sortBy}`);

    // Fetch from backend
    const backendUrl = `${backendBase}/api/admin/employees-with-roles/?${backendParams.toString()}`;

    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();

    // Enhance response with additional metadata
    const enhancedResponse = {
      ...data,
      meta: {
        query,
        filters: {
          division: division || 'all',
          role: role || 'all',
          position: position || 'all',
          status: status || 'all',
          date_range: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null
        },
        sort: {
          by: sortBy,
          order: sortOrder
        },
        pagination: {
          page,
          page_size: pageSize,
          total_pages: Math.ceil((data.count || 0) / pageSize),
          has_next: data.next !== null,
          has_prev: data.previous !== null
        }
      }
    };

    return NextResponse.json(enhancedResponse);

  } catch (error) {
    console.error('Error in advanced employee search:', error);
    return NextResponse.json({ detail: 'Internal server error' }, { status: 500 });
  }
}
