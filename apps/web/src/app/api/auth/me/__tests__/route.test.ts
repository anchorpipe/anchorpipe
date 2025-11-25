import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

describe('/api/auth/me GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(null);
  });

  it('returns 401 when no session present', async () => {
    mockReadSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ authenticated: false });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns user info when session exists', async () => {
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
    });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      authenticated: true,
      user: { id: 'user-1', email: 'admin@example.com', name: 'Admin' },
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });
});
