import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { GET } from '../route';

const mockHealthCheck = vi.hoisted(() => vi.fn());

vi.mock('@anchorpipe/database', () => ({
  healthCheck: mockHealthCheck,
}));

describe('/api/health/db GET', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    mockHealthCheck.mockReset();
    process.env.DATABASE_URL = 'postgres://test';
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalEnv;
    vi.useRealTimers();
  });

  it('returns 503 when DATABASE_URL is not configured', async () => {
    process.env.DATABASE_URL = '';

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: 'error',
      database: 'not_configured',
      message: 'DATABASE_URL not set',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns healthy when db responds', async () => {
    mockHealthCheck.mockResolvedValue(true);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'healthy',
      database: 'connected',
      timestamp: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns 503 when db is unhealthy', async () => {
    mockHealthCheck.mockResolvedValue(false);

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: 'unhealthy',
      database: 'disconnected',
    });
  });

  it('returns 503 when health check throws', async () => {
    mockHealthCheck.mockRejectedValue(new Error('timeout'));

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: 'error',
      database: 'error',
      error: 'timeout',
    });
  });
});
