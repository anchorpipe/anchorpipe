import { prisma } from '@anchorpipe/database';
import { assertQueue, connectRabbit, consumeJson } from '@anchorpipe/mq';
import { Counter, Registry } from 'prom-client';

const QUEUE_NAME = 'test.ingestion';

const registry = new Registry();
const ingestedCounter = new Counter({
  name: 'ingestion_messages_ingested_total',
  help: 'Total number of ingestion messages successfully processed',
  registers: [registry],
});
const failedCounter = new Counter({
  name: 'ingestion_messages_failed_total',
  help: 'Total number of ingestion messages that failed processing',
  registers: [registry],
});

type IngestionMessage = {
  type: 'test.run.received';
  timestamp: string;
  payload: {
    repoId: string;
    commitSha: string;
    runId: string;
    framework: string;
    testCount: number;
    branch?: string;
    pullRequest?: unknown;
    environment?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tests?: Array<{
      path: string;
      name: string;
      status: 'pass' | 'fail' | 'skip';
      durationMs?: number;
      startedAt?: string;
      failureDetails?: string; // redact per ADR-0012
    }>;
  };
};

function redactFailureDetails(input?: string): string | null {
  if (!input) return null;
  let value = input;
  // Mask obvious tokens/secrets-like strings (very rough pass)
  value = value.replace(
    /(token|secret|password|apikey|api_key)\s*[:=]\s*([^\s]+)/gi,
    '$1=[REDACTED]'
  );
  // Mask email-like patterns
  value = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  // Mask long base64-ish strings
  value = value.replace(/[A-Za-z0-9+/_-]{40,}/g, '[REDACTED_BLOB]');
  // Truncate excessively long logs
  const MAX = 1000;
  if (value.length > MAX) {
    value = value.slice(0, MAX) + '…[TRUNCATED]';
  }
  return value;
}

async function upsertTestCase(repoId: string, path: string, name: string, framework: string) {
  const existing = await prisma.testCase.findUnique({
    where: {
      repoId_path_name_framework: { repoId, path, name, framework },
    },
  });
  if (existing) return existing.id;
  const created = await prisma.testCase.create({
    data: { repoId, path, name, framework, tags: [] },
  });
  return created.id;
}

async function persistTestRun(
  repoId: string,
  testCaseId: string,
  commitSha: string,
  test: NonNullable<IngestionMessage['payload']['tests']>[number]
) {
  await prisma.testRun.create({
    data: {
      repoId,
      testCaseId,
      commitSha,
      status: test.status,
      durationMs: test.durationMs ?? null,
      startedAt: test.startedAt ? new Date(test.startedAt) : new Date(),
      failureDetails: redactFailureDetails(test.failureDetails),
      environmentHash: null,
    },
  });
}

async function handleMessage(message: IngestionMessage) {
  if (message.type !== 'test.run.received') return;
  const { repoId, commitSha, framework, tests = [] } = message.payload;
  for (const t of tests) {
    const testCaseId = await upsertTestCase(repoId, t.path, t.name, framework);
    await persistTestRun(repoId, testCaseId, commitSha, t);
  }
}

async function main() {
  if (process.env.INGESTION_WORKER_ENABLED !== 'true') {
    console.log('Ingestion worker disabled (INGESTION_WORKER_ENABLED != "true"). Exiting.');
    process.exit(0);
  }

  // Basic in-process retry with backoff prior to DLQ handoff
  const attemptWithRetry = async (fn: () => Promise<void>) => {
    const backoffs = [500, 1000, 2000]; // ms
    let lastError: unknown;
    for (let i = 0; i < backoffs.length; i++) {
      try {
        await fn();
        return;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, backoffs[i]));
      }
    }
    // Final attempt (no delay) before giving up to DLQ
    await fn().catch((err) => {
      throw err ?? lastError;
    });
  };

  const rabbitUrl = process.env.RABBIT_URL;
  if (!rabbitUrl) {
    console.error('RABBIT_URL not set; exiting.');
    process.exit(1);
  }

  const { channel } = await connectRabbit(rabbitUrl);
  await assertQueue(channel, QUEUE_NAME, {
    durable: true,
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'test.ingestion.failed',
  });

  console.log(`Ingestion worker consuming from ${QUEUE_NAME}`);

  await consumeJson(channel, QUEUE_NAME, async (msg: IngestionMessage) => {
    try {
      await attemptWithRetry(() => handleMessage(msg));
      ingestedCounter.inc();
    } catch (err) {
      failedCounter.inc();
      throw err; // bubble to nack so DLX handles per policy
    }
  });
}

// Start
main().catch((err) => {
  console.error('Ingestion worker fatal error:', err);
  process.exit(1);
});
