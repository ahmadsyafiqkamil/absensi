import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    // Get CSRF token from Django backend
    const response = await fetch(`${BACKEND_URL}/api/csrf-token/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      // If backend doesn't have CSRF endpoint, try to get from cookies
      const cookies = request.headers.get('cookie') || '';
      const csrfCookie = cookies.split(';').find(cookie => 
        cookie.trim().startsWith('csrftoken=')
      );
      
      if (csrfCookie) {
        const csrfToken = csrfCookie.split('=')[1];
        return NextResponse.json({ csrfToken });
      }
      
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    
    // Fallback: return empty token
    return NextResponse.json({ csrfToken: '' });
  }
}

