import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    
    // Proxy to backend
    const response = await proxyToBackend(
      request,
      '/employees/employee-positions/',
      {
        method: 'GET',
        queryParams: searchParams,
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in employee-positions GET:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee positions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    
    // Proxy to backend
    const response = await proxyToBackend(
      request,
      '/employees/employee-positions/',
      {
        method: 'POST',
        body: body,
        version: 'V2'
      }
    );

    return response;
  } catch (error) {
    console.error('[API Route] Error in employee-positions POST:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create employee position',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
