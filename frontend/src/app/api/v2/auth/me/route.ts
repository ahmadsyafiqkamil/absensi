import { getBackendBaseUrl, getAccessToken } from '@/lib/backend';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  const backendUrl = getBackendBaseUrl();

  console.log('--- DEBUG: /api/v2/auth/me ---');
  console.log('Backend URL:', backendUrl);
  console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'Not found');

  if (!accessToken) {
    return NextResponse.json({ error: 'Access token not found' }, { status: 401 });
  }

  try {
    const response = await fetch(`${backendUrl}/api/v2/auth/me/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to parse error response' }));
        console.error('Backend error:', response.status, errorData);
        return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying /api/v2/auth/me request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
