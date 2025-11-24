import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTelemetryFindMany = vi.hoisted(() => vi.fn());
const mockTelemetryCreate = vi.hoisted(() => vi.fn());
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockAssertQueue = vi.hoisted(() => vi.fn());
const mockConnectRabbit = vi.hoisted(() => vi.fn());
const mockPublishJson = vi.hoisted(() => vi.fn());

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    telemetryEvent: {
      findMany: mockTelemetryFindMany,
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

  it('returns duplicate result when prior ingestion matches run metadata', async () => {
    mockTelemetryFindMany.mockResolvedValueOnce([
      {
        id: 'existing-event',
        eventData: {
          commitSha: basePayload.commit_sha,
          runId: basePayload.run_id,
          framework: basePayload.framework,
        },
      },
    ]);

    const result = await processIngestion(basePayload, repoId, context);

    expect(result).toEqual({
      success: true,
      runId: basePayload.run_id,
      message: 'Test report received (duplicate)',
      summary: {
        tests_parsed: basePayload.tests.length,
        flaky_candidates: 0,
      },
    });
    expect(mockTelemetryCreate).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('Duplicate ingestion detected'),
        metadata: expect.objectContaining({ existingEventId: 'existing-event' }),
      })
    );
  });

  it('stores metadata and logs audit events for new ingestions', async () => {
    mockTelemetryFindMany.mockResolvedValueOnce([]);
    mockTelemetryCreate.mockResolvedValueOnce({});

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
  });
});

