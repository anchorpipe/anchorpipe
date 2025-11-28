import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAdapter = {
  forwardBatch: vi.fn(),
  forwardLog: vi.fn(),
  testConnection: vi.fn(),
};

const mockCreateHttpAdapter = vi.hoisted(() => vi.fn(() => mockAdapter));

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

vi.mock('../siem-adapters/http-adapter', () => ({
  createHttpAdapter: mockCreateHttpAdapter,
}));

describe('SIEM forwarder – advanced scenarios', () => {
  let forwardAuditLogsToSiem: typeof import('../siem-forwarder').forwardAuditLogsToSiem;
  let getSiemForwarder: typeof import('../siem-forwarder').getSiemForwarder;
  let prismaMock: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const module = await import('../siem-forwarder');
    forwardAuditLogsToSiem = module.forwardAuditLogsToSiem;
    getSiemForwarder = module.getSiemForwarder;
    const { prisma } = await import('@anchorpipe/database');
    prismaMock = prisma as any;
    mockAdapter.forwardBatch.mockReset();
    mockAdapter.testConnection.mockReset();
    delete process.env.SIEM_ENABLED;
    delete process.env.SIEM_TYPE;
    delete process.env.SIEM_HTTP_URL;
    delete process.env.SIEM_HTTP_HEADERS;
    delete process.env.SIEM_RETRY_DELAY;
  });

  it('retries failed entries and aggregates results', async () => {
    process.env.SIEM_ENABLED = 'true';
    process.env.SIEM_TYPE = 'http';
    process.env.SIEM_HTTP_URL = 'https://siem.example.com';
    process.env.SIEM_RETRY_DELAY = '0';

    const logs = [
      { id: 'log-1', action: 'login_success', subject: 'user', createdAt: new Date() },
      { id: 'log-2', action: 'login_failure', subject: 'user', createdAt: new Date() },
    ];
    prismaMock.auditLog.findMany.mockResolvedValue(logs);

    mockAdapter.forwardBatch
      .mockResolvedValueOnce({
        success: 1,
        failed: 1,
        errors: [{ logId: 'log-2', error: 'boom' }],
      })
      .mockResolvedValueOnce({
        success: 1,
        failed: 0,
        errors: [],
      });

    const result = await forwardAuditLogsToSiem();

    expect(mockAdapter.forwardBatch).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([{ logId: 'log-2', error: 'boom' }]);
  });

  it('recovers from adapter errors after retries', async () => {
    process.env.SIEM_ENABLED = 'true';
    process.env.SIEM_TYPE = 'http';
    process.env.SIEM_HTTP_URL = 'https://siem.example.com';
    process.env.SIEM_RETRY_DELAY = '0';

    prismaMock.auditLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'config_update', subject: 'system', createdAt: new Date() },
    ]);

    mockAdapter.forwardBatch
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ success: 1, failed: 0 });

    const result = await forwardAuditLogsToSiem();

    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('returns empty result when fetching logs throws', async () => {
    process.env.SIEM_ENABLED = 'true';
    process.env.SIEM_TYPE = 'http';
    process.env.SIEM_HTTP_URL = 'https://siem.example.com';

    prismaMock.auditLog.findMany.mockRejectedValue(new Error('db failure'));

    const result = await forwardAuditLogsToSiem();

    expect(result).toEqual({ success: 0, failed: 0 });
    expect(mockLogger.error).toHaveBeenCalledWith('SIEM forwarding failed', expect.any(Object));
  });

  it('warns when HTTP headers cannot be parsed', () => {
    process.env.SIEM_ENABLED = 'true';
    process.env.SIEM_TYPE = 'http';
    process.env.SIEM_HTTP_URL = 'https://siem.example.com';
    process.env.SIEM_HTTP_HEADERS = '{not-json';

    const forwarder = getSiemForwarder();

    expect(forwarder).toBeDefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Failed to parse SIEM_HTTP_HEADERS, using defaults',
      expect.any(Object)
    );
  });
});

