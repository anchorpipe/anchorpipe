import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRegistry = vi.hoisted(() => ({
  registerMetric: vi.fn(),
  metrics: vi.fn(),
}));

const mockHistogramInstance = vi.hoisted(() => ({
  observe: vi.fn(),
}));

const mockHistogram = vi.hoisted(() => vi.fn().mockImplementation(() => mockHistogramInstance));

const mockCollectDefaultMetrics = vi.hoisted(() => vi.fn());

const mockRegistryConstructor = vi.hoisted(() => vi.fn().mockImplementation(() => mockRegistry));

vi.mock('prom-client', () => {
  const mockClient = {
    Registry: mockRegistryConstructor,
    collectDefaultMetrics: mockCollectDefaultMetrics,
    Histogram: mockHistogram,
  };
  return {
    default: mockClient,
    Registry: mockClient.Registry,
    collectDefaultMetrics: mockClient.collectDefaultMetrics,
    Histogram: mockClient.Histogram,
  };
});

// Import after mocks are set up
import { httpRequestDurationMs, register, metricsText } from '../metrics';

describe('metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegistry.metrics.mockResolvedValue('mock metrics output');
  });

  it('exports httpRequestDurationMs histogram', () => {
    expect(httpRequestDurationMs).toBeDefined();
    expect(typeof httpRequestDurationMs.observe).toBe('function');
  });

  it('exports register', () => {
    expect(register).toBeDefined();
  });

  it('metricsText returns metrics string', async () => {
    const mockMetrics = 'mock metrics output';
    mockRegistry.metrics.mockResolvedValueOnce(mockMetrics);

    const result = await metricsText();

    expect(result).toBe(mockMetrics);
  });
});


