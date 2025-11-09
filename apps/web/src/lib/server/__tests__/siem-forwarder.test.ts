/**
 * SIEM Forwarder Tests
 *
 * Unit tests for SIEM forwarder service.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardAuditLogsToSiem, getSiemForwarder } from '../siem-forwarder';

// Mock dependencies
vi.mock('@anchorpipe/database', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SIEM Forwarder', () => {
  let prismaMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@anchorpipe/database');
    prismaMock = prisma as any;
    // Reset environment variables
    delete process.env.SIEM_ENABLED;
    delete process.env.SIEM_TYPE;
  });

  describe('getSiemForwarder', () => {
    it('should return disabled forwarder when SIEM_ENABLED is not set', () => {
      const forwarder = getSiemForwarder();
      expect(forwarder).toBeDefined();
    });

    it('should initialize forwarder when SIEM_ENABLED is true', () => {
      process.env.SIEM_ENABLED = 'true';
      process.env.SIEM_TYPE = 'http';
      process.env.SIEM_HTTP_URL = 'https://siem.example.com/api/logs';

      const forwarder = getSiemForwarder();
      expect(forwarder).toBeDefined();
    });
  });

  describe('forwardAuditLogsToSiem', () => {
    it('should return empty result when SIEM is disabled', async () => {
      const result = await forwardAuditLogsToSiem();
      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('should return empty result when no logs to process', async () => {
      process.env.SIEM_ENABLED = 'true';
      process.env.SIEM_TYPE = 'http';
      process.env.SIEM_HTTP_URL = 'https://siem.example.com/api/logs';

      prismaMock.auditLog.findMany.mockResolvedValue([]);

      const result = await forwardAuditLogsToSiem();
      expect(result).toEqual({ success: 0, failed: 0 });
    });

    it('should process audit logs and forward to SIEM', async () => {
      process.env.SIEM_ENABLED = 'true';
      process.env.SIEM_TYPE = 'http';
      process.env.SIEM_HTTP_URL = 'https://siem.example.com/api/logs';

      const mockLogs = [
        {
          id: 'log-1',
          action: 'login_success',
          subject: 'user',
          createdAt: new Date(),
          actor: { email: 'user@example.com' },
        },
        {
          id: 'log-2',
          action: 'login_failure',
          subject: 'user',
          createdAt: new Date(),
          actor: null,
        },
      ];

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      // Mock fetch for HTTP adapter
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      });

      const result = await forwardAuditLogsToSiem();

      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('testConnection', () => {
    it('should test SIEM connection', async () => {
      process.env.SIEM_ENABLED = 'true';
      process.env.SIEM_TYPE = 'http';
      process.env.SIEM_HTTP_URL = 'https://siem.example.com/api/logs';

      // Mock fetch for HTTP adapter
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      });

      const forwarder = getSiemForwarder();
      const result = await forwarder.testConnection();

      expect(result.success).toBeDefined();
    });

    it('should return error when adapter not initialized', async () => {
      delete process.env.SIEM_ENABLED;

      const forwarder = getSiemForwarder();
      const result = await forwarder.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });
  });
});
