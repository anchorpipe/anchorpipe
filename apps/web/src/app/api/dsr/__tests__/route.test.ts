import { describe, beforeEach, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from '../route';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockListRequests = vi.hoisted(() => vi.fn());

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/dsr-service', () => ({
  listDataSubjectRequests: mockListRequests,
}));

describe('/api/dsr GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockListRequests.mockResolvedValue([
      {
        id: 'req-1',
        type: 'export',
        status: 'pending',
        requestedAt: '2024-01-01',
        dueAt: '2024-02-01',
        processedAt: null,
        confirmationSentAt: null,
        metadata: { source: 'test' },
        events: [],
        exportData: { size: 10 },
      },
    ]);
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await GET({} as NextRequest);

    expect(res.status).toBe(401);
  });

  it('returns sanitized DSR data', async () => {
    const res = await GET({} as NextRequest);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: 'req-1',
        type: 'export',
        status: 'pending',
        requestedAt: '2024-01-01',
        dueAt: '2024-02-01',
        processedAt: null,
        confirmationSentAt: null,
        metadata: { source: 'test' },
        events: [],
        exportAvailable: true,
      },
    ]);
    expect(mockListRequests).toHaveBeenCalledWith('user-1');
  });

  it('returns 500 when the service throws', async () => {
    mockListRequests.mockRejectedValueOnce(new Error('db'));

    const res = await GET({} as NextRequest);

    expect(res.status).toBe(500);
  });
});

