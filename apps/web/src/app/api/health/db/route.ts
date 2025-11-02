import { NextResponse } from 'next/server';

/**
 * Database Health Check Endpoint
 * 
 * GET /api/health/db
 * 
 * Returns the health status of the database connection.
 * During build time, returns a 503 status.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Check if DATABASE_URL is set (not available during build)
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          status: 'error',
          database: 'not_configured',
          message: 'DATABASE_URL not set',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Dynamically import to avoid build-time evaluation issues
    const { healthCheck } = await import('@anchorpipe/database');
    const isHealthy = await healthCheck();

    if (isHealthy) {
      return NextResponse.json(
        {
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          status: 'unhealthy',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  } catch (error) {
    // During build or if DATABASE_URL is not set, return unhealthy
    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
