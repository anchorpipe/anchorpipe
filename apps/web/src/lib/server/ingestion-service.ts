/**
 * Ingestion Service
 *
 * Service for processing ingestion requests, storing metadata,
 * and publishing to message queue.
 *
 * Story: ST-303 (Critical Gap)
 */

import { prisma } from '@anchorpipe/database';
import { connectRabbit, assertQueue, publishJson } from '@anchorpipe/mq';
// Queue configuration
const QUEUE_CONFIG = {
  testIngestion: {
    name: 'test.ingestion',
    options: {
      durable: true,
      deadLetterExchange: 'dlx',
      deadLetterRoutingKey: 'test.ingestion.failed',
      arguments: {
        'x-message-ttl': 86400000, // 24h
      },
    },
  },
} as const;
import { logger } from './logger';
import { IngestionPayload } from './ingestion-schema';
import { writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from './audit-service';
import {
  checkIdempotency,
  recordIdempotency,
  serializeToJsonValue,
  type IdempotencyKeyData,
} from './idempotency-service';

/**
 * Ingestion result
 */
export interface IngestionResult {
  success: boolean;
  runId: string;
  message: string;
  summary?: {
    tests_parsed: number;
    flaky_candidates: number;
  };
  error?: string;
  isDuplicate?: boolean;
}

function isIngestionResultPayload(value: unknown): value is IngestionResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<IngestionResult>;
  return (
    typeof candidate.success === 'boolean' &&
    typeof candidate.runId === 'string' &&
    typeof candidate.message === 'string'
  );
}

/**
 * Store ingestion metadata in database
 */
async function storeIngestionMetadata(params: {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
  testCount: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.telemetryEvent.create({
      data: {
        repoId: params.repoId,
        eventType: 'ingestion.received',
        eventData: {
          commitSha: params.commitSha,
          runId: params.runId,
          framework: params.framework,
          testCount: params.testCount,
          ...params.metadata,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to store ingestion metadata', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - metadata storage failure shouldn't block ingestion
  }
}

/**
 * Publish ingestion event to message queue
 */
async function publishToQueue(params: {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
  payload: IngestionPayload;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const rabbitUrl = process.env.RABBIT_URL;
    if (!rabbitUrl) {
      logger.warn('RABBIT_URL not configured, skipping queue publish');
      return { success: true }; // Not a failure, just not configured
    }

    const { connection, channel } = await connectRabbit(rabbitUrl);

    try {
      // Assert queue exists
      await assertQueue(
        channel,
        QUEUE_CONFIG.testIngestion.name,
        QUEUE_CONFIG.testIngestion.options
      );

      // Publish event
      await publishJson(channel, QUEUE_CONFIG.testIngestion.name, {
        type: 'test.run.received',
        timestamp: new Date().toISOString(),
        payload: {
          repoId: params.repoId,
          commitSha: params.commitSha,
          runId: params.runId,
          framework: params.framework,
          testCount: params.payload.tests.length,
          branch: params.payload.branch,
          pullRequest: params.payload.pull_request,
          environment: params.payload.environment,
          metadata: params.payload.metadata,
        },
      });

      logger.info('Published ingestion event to queue', {
        repoId: params.repoId,
        commitSha: params.commitSha,
        runId: params.runId,
        framework: params.framework,
        testCount: params.payload.tests.length,
      });

      return { success: true };
    } finally {
      await channel.close();
      await connection.close();
    }
  } catch (error) {
    logger.error('Failed to publish to message queue', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process successful ingestion
 */
async function processSuccessfulIngestion(params: {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
  testCount: number;
  payload: IngestionPayload;
  context: { ipAddress: string | null; userAgent: string | null };
}): Promise<IngestionResult> {
  // Store metadata in database
  await storeIngestionMetadata({
    repoId: params.repoId,
    commitSha: params.commitSha,
    runId: params.runId,
    framework: params.framework,
    testCount: params.testCount,
    metadata: {
      branch: params.payload.branch,
      pullRequest: params.payload.pull_request,
      environment: params.payload.environment,
      metadata: params.payload.metadata,
    },
  });

  // Publish to message queue
  const queueResult = await publishToQueue({
    repoId: params.repoId,
    commitSha: params.commitSha,
    runId: params.runId,
    framework: params.framework,
    payload: params.payload,
  });
  if (!queueResult.success) {
    logger.warn('Failed to publish to queue, but continuing', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      error: queueResult.error,
    });
    // Don't fail ingestion if queue publish fails
  }

  // Log audit event
  await writeAuditLog({
    action: AUDIT_ACTIONS.other,
    subject: AUDIT_SUBJECTS.system,
    description: `Test report ingested: ${params.runId}`,
    metadata: {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      framework: params.framework,
      testCount: params.testCount,
      branch: params.payload.branch,
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  });

  logger.info('Successfully processed ingestion', {
    repoId: params.repoId,
    commitSha: params.commitSha,
    runId: params.runId,
    framework: params.framework,
    testCount: params.testCount,
  });

  return {
    success: true,
    runId: params.runId,
    message: 'Test report received',
    summary: {
      tests_parsed: params.testCount,
      flaky_candidates: 0, // Will be calculated by scoring service
    },
  };
}

/**
 * Process ingestion payload
 */
export async function processIngestion(
  payload: IngestionPayload,
  repoId: string,
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<IngestionResult> {
  const { commit_sha: commitSha, run_id: runId, framework, tests } = payload;
  const idempotencyData: IdempotencyKeyData = {
    repoId,
    commitSha,
    runId,
    framework,
  };

  try {
    // Check for duplicates via idempotency table
    const idempotencyCheck = await checkIdempotency(idempotencyData);
    if (idempotencyCheck.isDuplicate) {
      const fallback: IngestionResult = {
        success: true,
        runId,
        message: 'Test report received (duplicate)',
        summary: {
          tests_parsed: tests.length,
          flaky_candidates: 0,
        },
      };
      const cachedResponse = idempotencyCheck.existingResponse;
      const duplicateResponse = isIngestionResultPayload(cachedResponse)
        ? cachedResponse
        : fallback;

      logger.info('Idempotent ingestion deduplicated', {
        repoId,
        commitSha,
        runId,
        framework,
      });

      await writeAuditLog({
        action: AUDIT_ACTIONS.other,
        subject: AUDIT_SUBJECTS.system,
        description: `Duplicate ingestion detected: ${runId}`,
        metadata: {
          repoId,
          commitSha,
          runId,
          framework,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      return {
        ...duplicateResponse,
        isDuplicate: true,
      };
    }

    // Process successful ingestion
    const response = await processSuccessfulIngestion({
      repoId,
      commitSha,
      runId,
      framework,
      testCount: tests.length,
      payload,
      context,
    });

    await recordIdempotency(idempotencyData, serializeToJsonValue(response));
    return response;
  } catch (error) {
    logger.error('Failed to process ingestion', {
      repoId,
      commitSha,
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Log audit event for failure
    await writeAuditLog({
      action: AUDIT_ACTIONS.other,
      subject: AUDIT_SUBJECTS.system,
      description: `Ingestion failed: ${runId}`,
      metadata: {
        repoId,
        commitSha,
        runId,
        framework,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      success: false,
      runId,
      message: 'Ingestion failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
