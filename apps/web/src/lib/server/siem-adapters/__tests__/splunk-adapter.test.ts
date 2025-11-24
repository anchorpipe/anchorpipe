import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSplunkAdapter } from '../splunk-adapter';
import type { SiemLogEntry } from '../../siem-adapter';

describe('splunk-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('createSplunkAdapter', () => {
    it('throws error for localhost hostname', () => {
      expect(() =>
        createSplunkAdapter({ host: 'localhost', port: 8088, token: 'token' }, { timeout: 5000 })
      ).toThrow('Invalid Splunk host');
    });

    it('throws error for private IP hostname', () => {
      expect(() =>
        createSplunkAdapter({ host: '192.168.1.1', port: 8088, token: 'token' }, { timeout: 5000 })
      ).toThrow('Invalid Splunk host');
    });

    it('creates adapter with valid hostname', () => {
      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'token' },
        { timeout: 5000 }
      );

      expect(adapter).toBeDefined();
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

    it('forwards log successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'token-123' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://splunk.example.com:8088/services/collector/event',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Splunk token-123',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes custom index, source, and sourcetype', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createSplunkAdapter(
        {
          host: 'splunk.example.com',
          port: 8088,
          token: 'token',
          index: 'custom-index',
          source: 'custom-source',
          sourcetype: 'custom:sourcetype',
        },
        { timeout: 5000 }
      );

      await adapter.forwardLog(log);

      const callBody = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
      expect(callBody.index).toBe('custom-index');
      expect(callBody.source).toBe('custom-source');
      expect(callBody.sourcetype).toBe('custom:sourcetype');
    });

    it('handles HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'invalid' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Splunk HEC 401');
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

    it('forwards batch successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'token' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('handles batch failures', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error',
      } as Response);

      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'token' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('testConnection', () => {
    it('tests connection successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createSplunkAdapter(
        { host: 'splunk.example.com', port: 8088, token: 'token' },
        { timeout: 5000 }
      );

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
    });
  });
});
