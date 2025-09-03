import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '100'; // Get more permissions at once

    // Build query parameters
    const params = new URLSearchParams({
      page,
      page_size: pageSize,
    });

            // Use the public permissions endpoint for development
      const response = await fetch(`${BACKEND_URL}/api/public-permissions/?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to match our frontend interface
    const transformedData = {
      ...data,
      results: data.results?.map((permission: any) => ({
        id: permission.id,
        name: permission.name, // Use the name directly from backend
        codename: permission.codename, // Use the codename directly from backend
        content_type: permission.content_type,
        permission_type: permission.permission_type,
        permission_action: permission.permission_action,
        is_active: permission.is_active
      })) || []
    };
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
