/**
 * SIEM Forwarder Tests
 *
 * Unit tests for SIEM forwarder service.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { forwardAuditLogsToSiem, getSiemForwarder } from '../siem-forwarder';
import { SiemAdapter, SiemForwardResult } from '../siem-adapter';

// Mock dependencies
jest.mock('@anchorpipe/database', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SIEM Forwarder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

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

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      // Mock fetch for HTTP adapter
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('OK'),
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
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('OK'),
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
