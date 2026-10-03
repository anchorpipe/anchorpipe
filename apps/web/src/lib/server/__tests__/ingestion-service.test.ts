import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTelemetryCreate = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockAssertQueue = vi.hoisted(() => vi.fn());
const mockConnectRabbit = vi.hoisted(() => vi.fn());
const mockPublishJson = vi.hoisted(() => vi.fn());
const mockCheckIdempotency = vi.hoisted(() => vi.fn());
const mockRecordIdempotency = vi.hoisted(() => vi.fn());
const mockSerializeToJsonValue = vi.hoisted(() => vi.fn((value) => value));

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    telemetryEvent: {
      create: mockTelemetryCreate,
    },
  },
}));

vi.mock('@anchorpipe/mq', () => ({
  connectRabbit: mockConnectRabbit,
  assertQueue: mockAssertQueue,
  publishJson: mockPublishJson,
}));

vi.mock('../audit-service', () => ({
  AUDIT_ACTIONS: { other: 'other' },
  AUDIT_SUBJECTS: { system: 'system' },
  writeAuditLog: mockWriteAuditLog,
}));

vi.mock('../idempotency-service', () => ({
  checkIdempotency: mockCheckIdempotency,
  recordIdempotency: mockRecordIdempotency,
  serializeToJsonValue: mockSerializeToJsonValue,
}));

// Silence logger output in tests
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { processIngestion } from '../ingestion-service';

const repoId = '11111111-1111-1111-1111-111111111111';
const context = { ipAddress: '1.1.1.1', userAgent: 'vitest' };
const basePayload = {
  repo_id: repoId,
  commit_sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  run_id: 'run-123',
  framework: 'jest' as const,
  tests: [
    {
      path: 'packages/app/example.test.ts',
      name: 'should pass',
      status: 'pass' as const,
      durationMs: 42,
      startedAt: new Date().toISOString(),
    },
  ],
};

describe('ingestion-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RABBIT_URL;
  });

  it('returns cached response when idempotency key already processed', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({
      isDuplicate: true,
      existingResponse: {
        success: true,
        runId: basePayload.run_id,
        message: 'cached',
        summary: { tests_parsed: 1, flaky_candidates: 0 },
      },
    });

    const result = await processIngestion(basePayload, repoId, context);

    expect(result).toEqual({
      success: true,
      runId: basePayload.run_id,
      message: 'cached',
      summary: {
        tests_parsed: basePayload.tests.length,
        flaky_candidates: 0,
      },
      isDuplicate: true,
    });
    expect(mockTelemetryCreate).not.toHaveBeenCalled();
    expect(mockRecordIdempotency).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Duplicate ingestion detected'),
      })
    );
  });

  it('stores metadata and logs audit events for new ingestions', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({ isDuplicate: false });
    mockTelemetryCreate.mockResolvedValueOnce({});
    mockRecordIdempotency.mockResolvedValueOnce(undefined);
    mockSerializeToJsonValue.mockImplementationOnce((value) => value);

    const result = await processIngestion(basePayload, repoId, context);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Test report received');
    expect(mockTelemetryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          repoId,
          eventType: 'ingestion.received',
        }),
      })
    );
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Test report ingested'),
      })
    );
    expect(mockRecordIdempotency).toHaveBeenCalled();
  });

  it('falls back to default duplicate payload when cache is invalid', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({
      isDuplicate: true,
      existingResponse: 'not-a-valid-response',
    });

    const result = await processIngestion(basePayload, repoId, context);

    expect(result.message).toBe('Test report received (duplicate)');
    expect(result.summary?.tests_parsed).toBe(basePayload.tests.length);
  });

  it('publishes to the queue when RABBIT_URL is configured', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({ isDuplicate: false });
    mockTelemetryCreate.mockResolvedValueOnce({});
    mockSerializeToJsonValue.mockImplementationOnce((value) => value);
    process.env.RABBIT_URL = 'amqp://localhost';

    const channelClose = vi.fn().mockResolvedValue(undefined);
    const connectionClose = vi.fn().mockResolvedValue(undefined);
    const channel = { close: channelClose } as any;
    const connection = { close: connectionClose } as any;

    mockConnectRabbit.mockResolvedValueOnce({ channel, connection });
    mockAssertQueue.mockResolvedValueOnce(undefined);
    mockPublishJson.mockResolvedValueOnce(undefined);

    const result = await processIngestion(basePayload, repoId, context);

    expect(result.success).toBe(true);
    expect(mockConnectRabbit).toHaveBeenCalledWith('amqp://localhost');
    expect(mockAssertQueue).toHaveBeenCalled();
    expect(mockPublishJson).toHaveBeenCalledWith(
      channel,
      expect.any(String),
      expect.objectContaining({
        payload: expect.objectContaining({ repoId }),
      })
    );
    expect(channelClose).toHaveBeenCalled();
    expect(connectionClose).toHaveBeenCalled();
  });

  it('continues when queue publish fails', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({ isDuplicate: false });
    mockTelemetryCreate.mockResolvedValueOnce({});
    mockSerializeToJsonValue.mockImplementationOnce((value) => value);
    process.env.RABBIT_URL = 'amqp://localhost';

    mockConnectRabbit.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await processIngestion(basePayload, repoId, context);

    expect(result.success).toBe(true);
    expect(mockRecordIdempotency).toHaveBeenCalled();
  });

  it('returns failure when recording idempotency throws', async () => {
    mockCheckIdempotency.mockResolvedValueOnce({ isDuplicate: false });
    mockTelemetryCreate.mockResolvedValueOnce({});
    mockRecordIdempotency.mockRejectedValueOnce(new Error('db error'));

    const result = await processIngestion(basePayload, repoId, context);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Ingestion failed');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Ingestion failed'),
      })
    );
  });
});

