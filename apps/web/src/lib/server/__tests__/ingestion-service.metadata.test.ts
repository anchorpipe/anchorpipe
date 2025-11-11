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

import { processIngestion } from '../ingestion-service';

describe('processIngestion - metadata persistence', () => {
  beforeEach(() => {
    telemetryCreate.mockReset();
    telemetryFindMany.mockReset();
    telemetryFindMany.mockResolvedValue([]);
    // Ensure queue publish is skipped (no RABBIT_URL)
    delete (process as any).env.RABBIT_URL;
  });

  it('stores ingestion metadata and succeeds', async () => {
    const repoId = 'repo_123';
    const payload = {
      repo_id: repoId,
      commit_sha: 'abc123',
      run_id: 'run-1',
      framework: 'jest',
      tests: [{ path: 'a.spec.ts', name: 'a', status: 'pass' as const }],
      branch: 'main',
      pull_request: { number: 1 },
      environment: { os: 'linux' },
      metadata: { ci: 'gha' },
    };

    telemetryCreate.mockResolvedValue({ id: 'te1' });

    const result = await processIngestion(payload as any, repoId, {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(result.success).toBe(true);
    expect(result.runId).toBe('run-1');
    expect(telemetryCreate).toHaveBeenCalledTimes(1);
    const args = telemetryCreate.mock.calls[0][0];
    expect(args.data.repoId).toBe(repoId);
    expect(args.data.eventType).toBe('ingestion.received');
    expect(args.data.eventData.commitSha).toBe('abc123');
    expect(args.data.eventData.runId).toBe('run-1');
    expect(args.data.eventData.framework).toBe('jest');
    expect(args.data.eventData.testCount).toBe(1);
  });
});


