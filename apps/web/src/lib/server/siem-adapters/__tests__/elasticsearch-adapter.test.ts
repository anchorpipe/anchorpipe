import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElasticsearchAdapter } from '../elasticsearch-adapter';
import type { SiemLogEntry } from '../../siem-adapter';

describe('elasticsearch-adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const siemConfig = { type: 'elasticsearch' as const, enabled: true, timeout: 5000 };

  describe('createElasticsearchAdapter', () => {
    it('throws error for invalid URL', () => {
      expect(() =>
        createElasticsearchAdapter({ url: 'invalid-url', index: 'logs' }, siemConfig)
      ).toThrow('Invalid Elasticsearch URL');
    });

    it('throws error for non-http URL', () => {
      expect(() =>
        createElasticsearchAdapter({ url: 'ftp://example.com', index: 'logs' }, siemConfig)
      ).toThrow('Invalid Elasticsearch URL');
    });

    it('creates adapter with valid URL', () => {
      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      expect(adapter).toBeDefined();
      expect(adapter.forwardLog).toBeDefined();
      expect(adapter.forwardBatch).toBeDefined();
      expect(adapter.testConnection).toBeDefined();
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

    it('forwards log successfully with API key auth', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs', apiKey: 'key-123' },
        siemConfig
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://elasticsearch.example.com/logs/_doc',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'ApiKey key-123',
          }),
          body: JSON.stringify(log),
        })
      );
    });

    it('forwards log successfully with basic auth', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const adapter = createElasticsearchAdapter(
        {
          url: 'https://elasticsearch.example.com',
          index: 'logs',
          username: 'user',
          password: 'pass',
        },
        siemConfig
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

    it('handles HTTP error responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Elasticsearch 400');
    });

    it('handles network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      const result = await adapter.forwardLog(log);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
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
        json: async () => ({ items: [{ index: { status: 201 } }, { index: { status: 201 } }] }),
      } as Response);

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      const result = await adapter.forwardBatch(logs);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://elasticsearch.example.com/_bulk',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-ndjson',
          }),
        })
      );
    });

    it('handles partial batch failures', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ index: { status: 201 } }, { index: { error: { reason: 'Error message' } } }],
        }),
      } as Response);

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
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

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      const result = await adapter.testConnection();

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://elasticsearch.example.com/_cluster/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('handles connection test failures', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      const adapter = createElasticsearchAdapter(
        { url: 'https://elasticsearch.example.com', index: 'logs' },
        siemConfig
      );

      const result = await adapter.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Elasticsearch 503');
    });
  });
});
