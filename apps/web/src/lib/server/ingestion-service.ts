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
 * Check if event data matches ingestion parameters
 */
function matchesIngestionParams(
  eventData: { commitSha?: string; runId?: string; framework?: string } | null,
  params: { commitSha: string; runId: string; framework: string }
): boolean {
  return (
    eventData?.commitSha === params.commitSha &&
    eventData?.runId === params.runId &&
    eventData?.framework === params.framework
  );
}

/**
 * Check for duplicate ingestion (basic idempotency)
 */
async function checkDuplicateIngestion(params: {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
}): Promise<{ isDuplicate: boolean; existingEventId?: string }> {
  try {
    // Check for recent ingestion events (within last hour) with same repo
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = await prisma.telemetryEvent.findMany({
      where: {
        repoId: params.repoId,
        eventType: 'ingestion.received',
        eventTimestamp: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        eventTimestamp: 'desc',
      },
      take: 50, // Check last 50 events
    });

    // Check each event for matching identifiers
    for (const event of recentEvents) {
      const eventData = event.eventData as {
        commitSha?: string;
        runId?: string;
        framework?: string;
      } | null;

      if (matchesIngestionParams(eventData, params)) {
        return { isDuplicate: true, existingEventId: event.id };
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    logger.error('Failed to check duplicate ingestion', {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - idempotency check failure shouldn't block ingestion
    return { isDuplicate: false };
  }
}

/**
 * Handle duplicate ingestion
 */
async function handleDuplicateIngestion(params: {
  repoId: string;
  commitSha: string;
  runId: string;
  framework: string;
  testCount: number;
  existingEventId?: string;
  context: { ipAddress: string | null; userAgent: string | null };
}): Promise<IngestionResult> {
  logger.info('Duplicate ingestion detected', {
    repoId: params.repoId,
    commitSha: params.commitSha,
    runId: params.runId,
    framework: params.framework,
    existingEventId: params.existingEventId,
  });

  // Log audit event
  await writeAuditLog({
    action: AUDIT_ACTIONS.other,
    subject: AUDIT_SUBJECTS.system,
    description: `Duplicate ingestion detected: ${params.runId}`,
    metadata: {
      repoId: params.repoId,
      commitSha: params.commitSha,
      runId: params.runId,
      framework: params.framework,
      existingEventId: params.existingEventId,
    },
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  });

  return {
    success: true,
    runId: params.runId,
    message: 'Test report received (duplicate)',
    summary: {
      tests_parsed: params.testCount,
      flaky_candidates: 0, // Will be calculated later
    },
  };
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

  try {
    // Check for duplicates (basic idempotency)
    const duplicateCheck = await checkDuplicateIngestion({
      repoId,
      commitSha,
      runId,
      framework,
    });
    if (duplicateCheck.isDuplicate) {
      return await handleDuplicateIngestion({
        repoId,
        commitSha,
        runId,
        framework,
        testCount: tests.length,
        existingEventId: duplicateCheck.existingEventId,
        context,
      });
    }

    // Process successful ingestion
    return await processSuccessfulIngestion({
      repoId,
      commitSha,
      runId,
      framework,
      testCount: tests.length,
      payload,
      context,
    });
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
