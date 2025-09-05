import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils'

const BACKEND_URL = getBackendUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/admin/groups/${id}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Group not found' },
          { status: 404 }
        );
      }
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('DEBUG: Frontend API Route - Backend response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching group detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group detail' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('DEBUG: Frontend API Route - Received body:', body);
    console.log('DEBUG: Frontend API Route - body.permissions:', body.permissions);

    // If updating permissions, use the bulk update endpoint
    if (body.permissions) {
      const response = await fetch(`${BACKEND_URL}/api/admin/permission-management/bulk_update/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward cookies for authentication
          Cookie: request.headers.get('cookie') || '',
          // Forward CSRF token
          'X-CSRFToken': request.headers.get('x-csrftoken') || '',
        },
        body: JSON.stringify([{
          group_id: parseInt(id),
          permissions: body.permissions
        }]),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          errorData,
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // For other updates, use the regular group endpoint
    const response = await fetch(`${BACKEND_URL}/api/admin/groups/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
        // Forward CSRF token
        'X-CSRFToken': request.headers.get('x-csrftoken') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Forward request to Django backend
    const response = await fetch(`${BACKEND_URL}/api/admin/groups/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Group not found' },
          { status: 404 }
        );
      }
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}
