import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpAdapter } from '../http-adapter';
import type { SiemLogEntry } from '../../siem-adapter';

describe('http-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('createHttpAdapter', () => {
    it('throws error for invalid URL', () => {
      expect(() => createHttpAdapter({ url: 'invalid-url' }, { timeout: 5000 })).toThrow(
        'Invalid SIEM HTTP URL'
      );
    });

    it('creates adapter with valid URL', () => {
      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
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

    it('forwards log in JSON format', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
        { timeout: 5000, format: 'json' }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://siem.example.com/api/logs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(log),
        })
      );
    });

    it('forwards log with bearer auth', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createHttpAdapter(
        {
          url: 'https://siem.example.com/api/logs',
          auth: { type: 'bearer', token: 'token-123' },
        },
        { timeout: 5000 }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
          }),
        })
      );
    });

    it('forwards log with basic auth', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createHttpAdapter(
        {
          url: 'https://siem.example.com/api/logs',
          auth: { type: 'basic', username: 'user', password: 'pass' },
        },
        { timeout: 5000 }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
          }),
        })
      );
    });

    it('handles HTTP errors', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 500');
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
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true, text: async () => 'OK' } as Response)
        .mockResolvedValueOnce({ ok: true, text: async () => 'OK' } as Response);

      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('handles partial batch failures', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({ ok: true, text: async () => 'OK' } as Response)
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'Error' } as Response);

      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
        { timeout: 5000 }
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('testConnection', () => {
    it('tests connection successfully', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createHttpAdapter(
        { url: 'https://siem.example.com/api/logs' },
        { timeout: 5000 }
      );

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
    });
  });
});
