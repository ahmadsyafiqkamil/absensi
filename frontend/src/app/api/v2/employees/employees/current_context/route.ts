import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    // Proxy to backend
    const response = await proxyToBackend(
      request,
      '/employees/employees/current_context/',
      {
        method: 'GET',
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in current_context:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch current context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
