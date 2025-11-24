import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSyslogAdapter } from '../syslog-adapter';
import type { SiemLogEntry } from '../../siem-adapter';

const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../../logger', () => ({
  logger: mockLogger,
}));

describe('syslog-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const siemConfig = { type: 'syslog' as const, enabled: true, timeout: 5000 };

  describe('createSyslogAdapter', () => {
    it('creates adapter successfully', () => {
      const adapter = createSyslogAdapter(
        { host: 'syslog.example.com', port: 514, protocol: 'udp' },
        siemConfig
      );

      expect(adapter).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Syslog adapter is a placeholder - requires syslog library implementation'
      );
    });
  });

  describe('forwardLog', () => {
    const log: SiemLogEntry = {
      id: 'log-1',
      timestamp: '2024-01-01T00:00:00.000Z',
      action: 'user.login',
      subject: 'user',
      description: 'User logged in',
      severity: 'info',
    };

    it('forwards log (placeholder implementation)', async () => {
      const adapter = createSyslogAdapter(
        { host: 'syslog.example.com', port: 514, protocol: 'udp' },
        siemConfig
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Syslog message (placeholder)',
        expect.objectContaining({
          host: 'syslog.example.com',
          port: 514,
          protocol: 'udp',
        })
      );
    });
  });

  describe('forwardBatch', () => {
    const logs: SiemLogEntry[] = [
      {
        id: 'log-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        action: 'user.login',
        subject: 'user',
        description: 'User logged in',
        severity: 'info',
      },
      {
        id: 'log-2',
        timestamp: '2024-01-01T00:01:00.000Z',
        action: 'user.logout',
        subject: 'user',
        description: 'User logged out',
        severity: 'info',
      },
    ];

    it('forwards batch sequentially', async () => {
      const adapter = createSyslogAdapter(
        { host: 'syslog.example.com', port: 514, protocol: 'tcp' },
        siemConfig
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });
  });

  describe('testConnection', () => {
    it('tests connection (placeholder)', async () => {
      const adapter = createSyslogAdapter(
        { host: 'syslog.example.com', port: 514, protocol: 'tls' },
        siemConfig
      );

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
    });
  });
});
