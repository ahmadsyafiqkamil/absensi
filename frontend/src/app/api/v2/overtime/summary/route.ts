import { getBackendBaseUrl, getAccessToken } from '@/lib/backend';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: 'Access token not found' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryString = searchParams.toString();
  
  try {
    const backendUrl = `${getBackendBaseUrl()}/api/v2/overtime/summary/?${queryString}`;
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying overtime summary request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
