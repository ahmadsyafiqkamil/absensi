import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    
    // Proxy to backend
    const response = await proxyToBackend(
      request,
      '/employees/employees/switch_position/',
      {
        method: 'POST',
        body: body,
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in switch_position:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to switch position',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
