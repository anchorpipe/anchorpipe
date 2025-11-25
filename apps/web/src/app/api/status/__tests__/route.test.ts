import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GET } from '../route';

const mockHeaders = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
}));
const mockObserve = vi.hoisted(() => vi.fn());
const mockHttpRequestDurationMs = vi.hoisted(() => ({
  labels: vi.fn(() => ({
    observe: mockObserve,
  })),
}));
const mockRecordTelemetry = vi.hoisted(() => vi.fn());
const mockNowMs = vi.hoisted(() => vi.fn());
const mockDurationMs = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
  nowMs: mockNowMs,
  durationMs: mockDurationMs,
}));

vi.mock('@/lib/server/metrics', () => ({
  httpRequestDurationMs: mockHttpRequestDurationMs,
}));

vi.mock('@/lib/server/telemetry', () => ({
  recordTelemetry: mockRecordTelemetry,
}));

describe('/api/status GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers({ 'x-request-id': 'req-55' }));
    mockNowMs.mockReturnValue(1000);
    mockDurationMs.mockReturnValue(12);
    mockObserve.mockReset();
    mockHttpRequestDurationMs.labels.mockReturnValue({ observe: mockObserve });
    global.fetch = vi.fn();
    process.env.INTERNAL_SELF_BASE_URL = 'http://internal';
  });

  it('returns aggregated health and records metrics when all services ok', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      services: { db: true, mq: true, storage: true },
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledWith('http://internal/api/health/db', {
      cache: 'no-store',
    });
    expect(mockObserve).toHaveBeenCalledWith(12);
    expect(mockRecordTelemetry).toHaveBeenCalledWith({
      eventType: 'api.status',
      requestId: 'req-55',
      properties: { ok: true, dbOk: true, mqOk: true, storageOk: true, durationMs: 12 },
    });
  });

  it('returns 503 when any dependency fails', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ ok: false }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      services: { db: true, mq: false, storage: true },
    });
    expect(mockObserve).toHaveBeenCalledWith(12);
  });
});
