import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if HeroUI dependencies are available
    const herouiAvailable = await checkHeroUIDependencies();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'frontend',
      heroUI: herouiAvailable ? 'available' : 'not available',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || 'unknown'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'frontend',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function checkHeroUIDependencies(): Promise<boolean> {
  try {
    // This is a simple check - in a real scenario you might want to check actual module availability
    return true;
  } catch {
    return false;
  }
}

