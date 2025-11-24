import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockHeaders = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
}));
const mockHttpRequestDurationMs = vi.hoisted(() => ({
  labels: vi.fn(() => ({
    observe: vi.fn(),
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

describe('/api/version GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeaders.mockResolvedValue(new Headers({ 'x-request-id': 'req-123' }));
    mockNowMs.mockReturnValue(1000);
    mockDurationMs.mockReturnValue(5);
    mockHttpRequestDurationMs.labels.mockReturnValue({
      observe: vi.fn(),
    });
    process.env.NEXT_PUBLIC_APP_NAME = 'anchorpipe-web';
    process.env.NEXT_PUBLIC_APP_VERSION = '1.2.3';
  });

  it('returns build metadata and records telemetry', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      name: 'anchorpipe-web',
      version: '1.2.3',
    });
    expect(mockLogger.info).toHaveBeenCalledWith('GET /api/version start', {
      requestId: 'req-123',
    });
    expect(mockHttpRequestDurationMs.labels).toHaveBeenCalledWith({
      route: '/api/version',
      method: 'GET',
      status: '200',
    });
    expect(mockRecordTelemetry).toHaveBeenCalledWith({
      eventType: 'api.version',
      requestId: 'req-123',
      properties: { durationMs: 5 },
    });
  });
});
