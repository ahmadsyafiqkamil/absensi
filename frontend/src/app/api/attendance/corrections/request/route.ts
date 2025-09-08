import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
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

    // Get form data from request
    let formData: FormData;

    const contentType = request.headers.get('content-type') || '';

    console.log('Content-Type received:', contentType);

    // First, let's clone the request to avoid consuming the body twice
    const clonedRequest = request.clone();

    if (contentType.includes('multipart/form-data')) {
      console.log('Processing as FormData');
      formData = await request.formData();
    } else if (contentType.includes('application/json')) {
      console.log('Processing as JSON');
      // Handle JSON data
      try {
        const jsonData = await request.json();
        formData = new FormData();

        // Convert JSON to FormData
        for (const [key, value] of Object.entries(jsonData)) {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        }
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        // Debug: try to get raw body from cloned request
        try {
          const rawBody = await clonedRequest.text();
          console.error('Raw request body (first 200 chars):', rawBody.substring(0, 200));
          console.error('Raw body length:', rawBody.length);
        } catch (e) {
          console.error('Could not read raw body:', e);
        }
        return NextResponse.json(
          { detail: 'Invalid JSON format in request body' },
          { status: 400 }
        );
      }
    } else {
      console.log('Content-Type not recognized, trying FormData fallback');
      // Try to parse as form data anyway, but with better error handling
      try {
        formData = await request.formData();
      } catch (error) {
        console.error('Form data parsing error:', error);
        return NextResponse.json(
          { detail: 'Invalid content type. Expected multipart/form-data or application/json' },
          { status: 400 }
        );
      }
    }
    
    // Build backend URL
    const backend = getBackendUrl();
    const backendUrl = `${backend}/api/attendance/corrections/request`;

    // Forward request to backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        // Don't set Content-Type for FormData, let browser set it automatically
      },
      body: formData, // Forward the form data as-is
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
    console.error('Error in correction request API:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
