import { NextRequest, NextResponse } from 'next/server';
import { authenticateHmacRequest } from '@/lib/server/hmac-auth';
import { rateLimit } from '@/lib/server/rate-limit';
import {
  AUDIT_ACTIONS,
  AUDIT_SUBJECTS,
  extractRequestContext,
  writeAuditLog,
} from '@/lib/server/audit-service';
import { IngestionPayloadSchema } from '@/lib/server/ingestion-schema';
import { processIngestion } from '@/lib/server/ingestion-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for ingestion

/**
 * Check rate limit and return result
 */
async function checkRateLimit(
  request: NextRequest,
  context: { userAgent: string | null }
): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
  const rateLimitResult = await rateLimit('ingestion:submit', request, (violationIp, key) => {
    writeAuditLog({
      action: AUDIT_ACTIONS.loginFailure, // Using loginFailure as generic security event
      subject: AUDIT_SUBJECTS.security,
      description: `Rate limit violation: ${key} exceeded for IP ${violationIp}`,
      metadata: { key, ip: violationIp, endpoint: '/api/ingestion' },
      ipAddress: violationIp,
      userAgent: context.userAgent,
    });
  });

  return rateLimitResult;
}

/**
 * Validate request body size
 */
function validateBodySize(body: string): { valid: boolean; error?: string } {
  if (!body || body.length === 0) {
    return { valid: false, error: 'Request body is required' };
  }

  const maxSizeBytes = 50 * 1024 * 1024; // 50MB
  if (body.length > maxSizeBytes) {
    return {
      valid: false,
      error: `Payload too large. Maximum size is ${maxSizeBytes} bytes.`,
    };
  }

  return { valid: true };
}

/**
 * Authenticate request and extract repo ID
 */
async function authenticateRequest(
  request: NextRequest,
  body: string
): Promise<{ success: boolean; repoId?: string; error?: string }> {
  const authResult = await authenticateHmacRequest(request, body);
  if (!authResult.success) {
    return { success: false, error: authResult.error || 'Authentication failed' };
  }

  const repoId = authResult.repoId;
  if (!repoId) {
    return { success: false, error: 'Repository ID not found in authentication' };
  }

  return { success: true, repoId };
}

/**
 * Parse and validate JSON payload
 */
function parseAndValidatePayload(
  body: string,
  repoId: string
): { success: boolean; payload?: unknown; error?: string; details?: unknown } {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    return { success: false, error: 'Invalid JSON payload' };
  }

  const validationResult = IngestionPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    logger.warn('Invalid ingestion payload', {
      repoId,
      errors: validationResult.error.issues,
    });
    return {
      success: false,
      error: 'Invalid payload',
      details: validationResult.error.issues.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
  }

  const validatedPayload = validationResult.data;

  // Verify repo_id matches authenticated repo
  if (validatedPayload.repo_id !== repoId) {
    return { success: false, error: 'Repository ID mismatch' };
  }

  return { success: true, payload: validatedPayload };
}

/**
 * POST /api/ingestion
 * Ingestion endpoint for CI systems to submit test reports
 * Requires: Authorization: Bearer <repo_id> and X-FR-Sig: <hmac_signature>
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request);

  // Check rate limit
  const rateLimitResult = await checkRateLimit(request, context);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: rateLimitResult.headers,
      }
    );
  }

  try {
    // Read and validate request body
    const body = await request.text();
    const bodyValidation = validateBodySize(body);
    if (!bodyValidation.valid) {
      return NextResponse.json(
        { error: bodyValidation.error },
        {
          status: bodyValidation.error?.includes('too large') ? 413 : 400,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Authenticate request
    const authResult = await authenticateRequest(request, body);
    if (!authResult.success || !authResult.repoId) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    // Parse and validate payload
    const payloadResult = parseAndValidatePayload(body, authResult.repoId);
    if (!payloadResult.success || !payloadResult.payload) {
      const responseBody: { error: string; details?: unknown } = {
        error: payloadResult.error || 'Invalid payload',
      };
      if (payloadResult.details) {
        responseBody.details = payloadResult.details;
      }
      return NextResponse.json(responseBody, {
        status: payloadResult.error?.includes('mismatch') ? 403 : 400,
        headers: rateLimitResult.headers,
      });
    }

    // Process ingestion
    const result = await processIngestion(
      payloadResult.payload as Parameters<typeof processIngestion>[0],
      authResult.repoId,
      context
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Ingestion failed' },
        { status: 500, headers: rateLimitResult.headers }
      );
    }

    return NextResponse.json(
      {
        runId: result.runId,
        message: result.message,
        summary: result.summary,
      },
      {
        status: 200,
        headers: rateLimitResult.headers,
      }
    );
  } catch (error) {
    logger.error('Ingestion error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    const errorMessage = error instanceof Error ? error.message : 'Ingestion failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: rateLimitResult.headers }
    );
  }
}
