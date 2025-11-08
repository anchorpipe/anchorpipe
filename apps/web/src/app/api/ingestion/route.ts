import { NextRequest, NextResponse } from 'next/server';
import { authenticateHmacRequest } from '@/lib/server/hmac-auth';
import { rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for ingestion

/**
 * POST /api/ingestion
 * Ingestion endpoint for CI systems to submit test reports
 * Requires: Authorization: Bearer <repo_id> and X-FR-Sig: <hmac_signature>
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await rateLimit('ingestion:submit', request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          ...rateLimitResult.headers,
          'Retry-After': String(
            Math.ceil(
              (parseInt(rateLimitResult.headers['X-RateLimit-Reset'] || '0') -
                Math.floor(Date.now() / 1000)) /
                60
            )
          ),
        },
      }
    );
  }

  try {
    // Read request body
    const body = await request.text();
    if (!body || body.length === 0) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // Check payload size (50MB limit per PRD)
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB
    if (body.length > maxSizeBytes) {
      return NextResponse.json(
        { error: `Payload too large. Maximum size is ${maxSizeBytes} bytes.` },
        { status: 413, headers: rateLimitResult.headers }
      );
    }

    // Authenticate using HMAC
    const authResult = await authenticateHmacRequest(request, body);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    // TODO: Parse test report (JUnit XML, Jest JSON, PyTest JSON, etc.)
    // TODO: Validate idempotency key (repo_id, commit_sha, run_id, framework)
    // TODO: Store metadata in database
    // TODO: Publish to message queue for async processing
    // TODO: Upload large artifacts to object storage

    // For now, return a placeholder response
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return NextResponse.json(
      {
        runId,
        message: 'Test report received',
        summary: {
          tests_parsed: 0, // TODO: Parse and count
          flaky_candidates: 0, // TODO: Identify candidates
        },
      },
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
    );
  } catch (error) {
    console.error('Ingestion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ingestion failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: rateLimitResult.headers }
    );
  }
}
