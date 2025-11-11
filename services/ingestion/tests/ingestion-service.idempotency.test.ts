import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@anchorpipe/mq', () => ({
  connectRabbit: vi.fn(),
  assertQueue: vi.fn(),
  publishJson: vi.fn(),
}));

const telemetryCreate = vi.fn();
const telemetryFindMany = vi.fn();

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    telemetryEvent: {
      create: telemetryCreate,
      findMany: telemetryFindMany,
    },
  },
}));

// Test the ingestion service (API-layer) from apps/web
import { processIngestion } from '../../../apps/web/src/lib/server/ingestion-service';

describe('processIngestion - idempotency (duplicate suppression)', () => {
  beforeEach(() => {
    telemetryCreate.mockReset();
    telemetryFindMany.mockReset();
    delete (process as any).env.RABBIT_URL;
  });

  it('returns success without duplicating metadata when duplicate detected', async () => {
    const repoId = 'repo_123';
    const payload = {
      repo_id: repoId,
      commit_sha: 'abc123',
      run_id: 'run-1',
      framework: 'jest',
      tests: [{ path: 'a.spec.ts', name: 'a', status: 'pass' as const }],
    };

    telemetryFindMany.mockResolvedValue([
      {
        id: 'evt-1',
        eventData: {
          commitSha: 'abc123',
          runId: 'run-1',
          framework: 'jest',
        },
      },
    ]);

    const result = await processIngestion(payload as any, repoId, {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('duplicate');
    expect(telemetryCreate).not.toHaveBeenCalled();
  });
});


