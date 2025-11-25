import { NextRequest, NextResponse } from 'next/server';
import { authenticateHmacRequest } from '@/lib/server/hmac-auth';
import { extractRequestContext } from '@/lib/server/audit-service';
import { IngestionPayloadSchema } from '@/lib/server/ingestion-schema';
import { processIngestion } from '@/lib/server/ingestion-service';
import { logger } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for ingestion

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
 * Handle body validation error response
 */
function createBodyValidationErrorResponse(
  error: string | undefined
): NextResponse<{ error: string }> {
  const status = error?.includes('too large') ? 413 : 400;
  return NextResponse.json({ error: error || 'Invalid request body' }, { status });
}

/**
 * Handle authentication error response
 */
function createAuthErrorResponse(error: string | undefined): NextResponse<{ error: string }> {
  return NextResponse.json({ error: error || 'Authentication failed' }, { status: 401 });
}

/**
 * Handle payload validation error response
 */
function createPayloadValidationErrorResponse(
  error: string | undefined,
  details: unknown
): NextResponse<{ error: string; details?: unknown }> {
  const responseBody: { error: string; details?: unknown } = {
    error: error || 'Invalid payload',
  };
  if (details) {
    responseBody.details = details;
  }
  const status = error?.includes('mismatch') ? 403 : 400;
  return NextResponse.json(responseBody, { status });
}

/**
 * Handle ingestion processing error response
 */
function createIngestionErrorResponse(error: string | undefined): NextResponse<{ error: string }> {
  return NextResponse.json({ error: error || 'Ingestion failed' }, { status: 500 });
}

/**
 * Handle successful ingestion response
 */
function createSuccessResponse(
  runId: string,
  message: string,
  summary: { tests_parsed: number; flaky_candidates: number } | undefined
): NextResponse<{
  runId: string;
  message: string;
  summary?: { tests_parsed: number; flaky_candidates: number };
}> {
  return NextResponse.json(
    {
      runId,
      message,
      summary,
    },
    {
      status: 200,
    }
  );
}

/**
 * Handle unexpected errors
 */
function createUnexpectedErrorResponse(error: unknown): NextResponse<{ error: string }> {
  logger.error('Ingestion error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  const errorMessage = error instanceof Error ? error.message : 'Ingestion failed';
  return NextResponse.json({ error: errorMessage }, { status: 500 });
}

/**
 * POST /api/ingestion
 * Ingestion endpoint for CI systems to submit test reports
 * Requires: Authorization: Bearer <repo_id> and X-FR-Sig: <hmac_signature>
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request);

  try {
    // Read and validate request body
    const body = await request.text();
    const bodyValidation = validateBodySize(body);
    if (!bodyValidation.valid) {
      return createBodyValidationErrorResponse(bodyValidation.error);
    }

    // Authenticate request
    const authResult = await authenticateRequest(request, body);
    if (!authResult.success || !authResult.repoId) {
      return createAuthErrorResponse(authResult.error);
    }

    // Parse and validate payload
    const payloadResult = parseAndValidatePayload(body, authResult.repoId);
    if (!payloadResult.success || !payloadResult.payload) {
      return createPayloadValidationErrorResponse(payloadResult.error, payloadResult.details);
    }

    // Process ingestion
    const result = await processIngestion(
      payloadResult.payload as Parameters<typeof processIngestion>[0],
      authResult.repoId,
      context
    );

    if (!result.success) {
      return createIngestionErrorResponse(result.error);
    }

    return createSuccessResponse(result.runId, result.message, result.summary);
  } catch (error) {
    return createUnexpectedErrorResponse(error);
  }
}
