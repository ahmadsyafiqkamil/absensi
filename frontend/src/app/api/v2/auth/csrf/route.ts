import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend CSRF endpoint
    const response = await proxyToBackend(
      request,
      '/auth/csrf-token/',
      {
        method: 'GET',
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in CSRF:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch CSRF token',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
