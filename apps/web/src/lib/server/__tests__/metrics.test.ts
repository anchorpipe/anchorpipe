import { describe, it, expect, vi } from 'vitest';
import { httpRequestDurationMs, metricsText, register } from '../metrics';

vi.mock('prom-client', () => {
  const mockRegistry = {
    registerMetric: vi.fn(),
    metrics: vi.fn(),
  };

  const mockHistogram = vi.fn(() => ({
    observe: vi.fn(),
  }));

  return {
    default: {
      Registry: vi.fn(() => mockRegistry),
      collectDefaultMetrics: vi.fn(),
    },
    Registry: vi.fn(() => mockRegistry),
    collectDefaultMetrics: vi.fn(),
    Histogram: mockHistogram,
  };
});

describe('metrics', () => {
  it('exports httpRequestDurationMs histogram', () => {
    expect(httpRequestDurationMs).toBeDefined();
    expect(typeof httpRequestDurationMs.observe).toBe('function');
  });

  it('exports register', () => {
    expect(register).toBeDefined();
  });

  it('metricsText returns metrics string', async () => {
    const mockMetrics = 'mock metrics output';
    vi.mocked(register.metrics).mockResolvedValueOnce(mockMetrics);

    const result = await metricsText();

    expect(result).toBe(mockMetrics);
  });
});

