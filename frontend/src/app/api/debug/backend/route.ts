import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/backend';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = getBackendBaseUrl();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    // Test backend connectivity
    const healthResponse = await fetch(`${backendUrl}/api/v2/auth/health/`, {
      method: 'GET',
      cache: 'no-store'
    });

    let authTestResult = null;
    if (accessToken) {
      // Test auth endpoint
      const authResponse = await fetch(`${backendUrl}/api/v2/auth/me/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
      
      authTestResult = {
        status: authResponse.status,
        ok: authResponse.ok,
        data: authResponse.ok ? await authResponse.json() : await authResponse.text()
      };
    }

    // Test provision endpoint
    let provisionTestResult = null;
    if (accessToken) {
      const provisionResponse = await fetch(`${backendUrl}/api/v2/users/users/provision/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: `test_${Date.now()}`,
          password: 'testpass',
          email: 'test@example.com',
          group: 'pegawai'
        }),
        cache: 'no-store'
      });

      provisionTestResult = {
        status: provisionResponse.status,
        ok: provisionResponse.ok,
        data: provisionResponse.ok ? await provisionResponse.json() : await provisionResponse.text()
      };
    }

    return NextResponse.json({
      message: 'Backend connectivity test',
      backendUrl,
      health: {
        status: healthResponse.status,
        ok: healthResponse.ok
      },
      auth: authTestResult,
      provision: provisionTestResult,
      accessToken: accessToken ? 'present' : 'missing'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Backend connectivity test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: getBackendBaseUrl()
    }, { status: 500 });
  }
}
