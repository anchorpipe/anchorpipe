import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockGetExportPayload = vi.hoisted(() => vi.fn());
const mockExtractContext = vi.hoisted(() =>
  vi.fn(() => ({ ipAddress: '1.1.1.1', userAgent: 'vitest' }))
);
const mockWriteAuditLog = vi.hoisted(() => vi.fn());
const mockConvertCsv = vi.hoisted(() => vi.fn(() => 'csv,data'));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/dsr-service', () => ({
  getExportPayload: mockGetExportPayload,
}));

vi.mock('@/lib/server/audit-service', () => ({
  AUDIT_ACTIONS: { dsrExportDownload: 'dsrExportDownload' },
  AUDIT_SUBJECTS: { dsr: 'dsr' },
  extractRequestContext: mockExtractContext,
  writeAuditLog: mockWriteAuditLog,
}));

vi.mock('@/lib/server/csv-export', () => ({
  convertDsrPayloadToCsv: mockConvertCsv,
}));

const params = Promise.resolve({ requestId: 'req-1' });

describe('/api/dsr/export/[requestId] GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockGetExportPayload.mockResolvedValue({ id: 'req-1', metadata: { size: 1 } });
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await GET({} as NextRequest, { params });

    expect(res.status).toBe(401);
  });

  it('returns JSON export by default', async () => {
    const res = await GET(
      buildNextRequest('http://localhost/api/dsr/export/req-1', { method: 'GET' }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(await res.text()).toContain('"id": "req-1"');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'dsrExportDownload',
        metadata: expect.objectContaining({ format: 'json' }),
      })
    );
  });

  it('returns CSV export when requested', async () => {
    const res = await GET(
      buildNextRequest('http://localhost/api/dsr/export/req-1?format=csv', { method: 'GET' }),
      { params }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(await res.text()).toBe('csv,data');
    expect(mockConvertCsv).toHaveBeenCalledWith({ id: 'req-1', metadata: { size: 1 } });
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ format: 'csv' }),
      })
    );
  });

  it('maps service errors to 404', async () => {
    mockGetExportPayload.mockRejectedValueOnce(new Error('Not found'));

    const res = await GET(
      buildNextRequest('http://localhost/api/dsr/export/req-1', { method: 'GET' }),
      { params }
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

