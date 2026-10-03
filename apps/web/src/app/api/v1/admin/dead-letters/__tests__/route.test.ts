import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { POST } from '../[id]/replay/route';
import { prisma } from '@anchorpipe/database';
import { NextRequest } from 'next/server';

vi.mock('@anchorpipe/database', () => ({
  prisma: {
    deadLetter: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: vi.fn().mockReturnValue({ ipAddress: '127.0.0.1', userAgent: 'test' }),
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  AUDIT_ACTIONS: { other: 'other' },
  AUDIT_SUBJECTS: { system: 'system' },
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: vi.fn().mockResolvedValue({ sub: 'admin-1' }),
}));

vi.mock('@/lib/server/rbac-service', () => ({
  userHasAdminRole: vi.fn().mockResolvedValue(true),
}));

describe('DLQ Admin APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns list of dead letters for authenticated admin', async () => {
    const mockDeadLetters = [
      { id: 'dl-1', tenantId: 'tenant-1', receiptId: 'rec-1', reasonCode: 'PARSER_ERROR' },
    ];
    vi.mocked(prisma.deadLetter.findMany).mockResolvedValue(mockDeadLetters as any);

    const req = new NextRequest('http://localhost/api/v1/admin/dead-letters');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deadLetters).toEqual(mockDeadLetters);
  });

  it('POST /replay re-enqueues outbox event and deletes dead letter for authenticated admin', async () => {
    const mockDeadLetter = {
      id: 'dl-1',
      tenantId: 'tenant-1',
      receiptId: 'rec-1',
      reasonCode: 'PARSER_ERROR',
    };
    vi.mocked(prisma.deadLetter.findUnique).mockResolvedValue(mockDeadLetter as any);
    vi.mocked(prisma.outboxEvent.create).mockResolvedValue({ id: 'outbox-1' } as any);

    const req = new NextRequest('http://localhost/api/v1/admin/dead-letters/dl-1/replay', {
      method: 'POST',
    });
    const res = await POST(req, { params: Promise.resolve({ id: 'dl-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain('replayed successfully');
    expect(body.replayedEventId).toBe('outbox-1');
  });
});
