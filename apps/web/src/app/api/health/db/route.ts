import { NextResponse } from 'next/server';
import { healthCheck } from '@anchorpipe/database';

/**
 * Database Health Check Endpoint
 * 
 * GET /api/health/db
 * 
 * Returns the health status of the database connection.
 */
export async function GET() {
  try {
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
    return NextResponse.json(
      {
        status: 'error',
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
