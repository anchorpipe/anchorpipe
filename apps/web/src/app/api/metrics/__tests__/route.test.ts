import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockMetricsText = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/metrics', () => ({
  metricsText: mockMetricsText,
}));

describe('/api/metrics GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMetricsText.mockResolvedValue('# HELP http_requests_total Total requests');
  });

  it('returns Prometheus metrics text', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain; version=0.0.4; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toBe('# HELP http_requests_total Total requests');
    expect(mockMetricsText).toHaveBeenCalled();
  });
});
