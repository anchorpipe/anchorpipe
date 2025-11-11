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
      failureDetails?: string;
    }>;
  };
};

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
      failureDetails: test.failureDetails ?? null,
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
  const rabbitUrl = process.env.RABBIT_URL;
  if (!rabbitUrl) {
    // eslint-disable-next-line no-console
    console.error('RABBIT_URL not set; exiting.');
    process.exit(1);
  }

  const { connection, channel } = await connectRabbit(rabbitUrl);
  await assertQueue(channel, QUEUE_NAME, {
    durable: true,
    deadLetterExchange: 'dlx',
    deadLetterRoutingKey: 'test.ingestion.failed',
  });

  // eslint-disable-next-line no-console
  console.log(`Ingestion worker consuming from ${QUEUE_NAME}`);

  await consumeJson(channel, QUEUE_NAME, async (msg: IngestionMessage) => {
    try {
      await handleMessage(msg);
      ingestedCounter.inc();
    } catch (err) {
      failedCounter.inc();
      throw err; // bubble to nack so DLX handles per policy
    }
  });
}

// Start
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Ingestion worker fatal error:', err);
  process.exit(1);
});


