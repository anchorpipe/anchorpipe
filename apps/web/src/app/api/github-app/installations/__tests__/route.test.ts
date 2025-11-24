import { describe, beforeEach, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockReadSession = vi.hoisted(() => vi.fn());
const mockListInstallations = vi.hoisted(() => vi.fn());
const mockGetByAccount = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('@/lib/server/auth', () => ({
  readSession: mockReadSession,
}));

vi.mock('@/lib/server/github-app-service', () => ({
  listGitHubAppInstallations: mockListInstallations,
  getGitHubAppInstallationsByAccount: mockGetByAccount,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const buildRequest = (query?: string) =>
  buildNextRequest(`http://localhost/api/github-app/installations${query ? `?${query}` : ''}`);

describe('/api/github-app/installations GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadSession.mockResolvedValue({ sub: 'user-1' });
    mockListInstallations.mockResolvedValue([{ id: 1 }]);
    mockGetByAccount.mockResolvedValue([{ id: 2 }]);
  });

  it('requires authentication', async () => {
    mockReadSession.mockResolvedValueOnce(null);

    const res = await GET(buildRequest());

    expect(res.status).toBe(401);
  });

  it('lists all installations when no filter is provided', async () => {
    const res = await GET(buildRequest());

    expect(res.status).toBe(200);
    expect(mockListInstallations).toHaveBeenCalled();
    expect(await res.json()).toEqual({ installations: [{ id: 1 }] });
  });

  it('lists installations for a specific account when requested', async () => {
    const res = await GET(buildRequest('account=acme'));

    expect(res.status).toBe(200);
    expect(mockGetByAccount).toHaveBeenCalledWith('acme');
    expect(await res.json()).toEqual({ installations: [{ id: 2 }] });
  });

  it('returns 500 when listing fails', async () => {
    mockListInstallations.mockRejectedValueOnce(new Error('db down'));

    const res = await GET(buildRequest());

    expect(res.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
