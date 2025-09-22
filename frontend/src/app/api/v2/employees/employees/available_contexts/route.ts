import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend
    const response = await proxyToBackend(
      request,
      '/employees/employees/available_contexts/',
      {
        method: 'GET',
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in available_contexts:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch available contexts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
