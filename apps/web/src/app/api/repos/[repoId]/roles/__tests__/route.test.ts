import { describe, beforeEach, it, expect, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { RepoRole } from '@/lib/rbac';
import { GET, POST, DELETE } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockRequireAuthz = vi.hoisted(() => vi.fn());
const mockGetRepoUsers = vi.hoisted(() => vi.fn());
const mockAssignRole = vi.hoisted(() => vi.fn());
const mockRemoveRole = vi.hoisted(() => vi.fn());
const mockValidateRequest = vi.hoisted(() => vi.fn());
const mockExtractRequestContext = vi.hoisted(() => vi.fn(() => ({ ipAddress: '1.1.1.1' })));

vi.mock('@/lib/server/authz', () => ({
  requireAuthz: mockRequireAuthz,
}));

vi.mock('@/lib/server/rbac-service', () => ({
  getRepoUsers: mockGetRepoUsers,
  assignRole: mockAssignRole,
  removeRole: mockRemoveRole,
}));

vi.mock('@/lib/validation', () => ({
  validateRequest: mockValidateRequest,
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: mockExtractRequestContext,
}));

const params = Promise.resolve({ repoId: 'repo-1' });
const baseUrl = 'http://localhost/api/repos/repo-1/roles';
const baseRequest = buildNextRequest(baseUrl, { method: 'GET' });

function jsonRequest(method: 'POST' | 'DELETE', body: unknown) {
  return buildNextRequest(baseUrl, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const invoke = (
  handler: (
    request: NextRequest,
    context: { params: Promise<{ repoId: string }> }
  ) => Promise<Response>,
  request: NextRequest
) => handler(request, { params });

async function expectValidationFailure(handler: typeof POST | typeof DELETE, request: NextRequest) {
  const res = await invoke(handler, request);
  expect(res.status).toBe(400);
  return res;
}

async function expectMutationSuccess(options: {
  handler: typeof POST | typeof DELETE;
  request: NextRequest;
  expectedBody: Record<string, unknown>;
  assertion: () => void;
}) {
  const res = await invoke(options.handler, options.request);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(options.expectedBody);
  options.assertion();
}

describe('/api/repos/[repoId]/roles GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthz.mockResolvedValue({ userId: 'admin-1' });
    mockGetRepoUsers.mockResolvedValue([{ id: 'user-1', role: RepoRole.ADMIN }]);
  });

  it('returns repo users when authorized', async () => {
    const res = await invoke(GET, baseRequest as unknown as NextRequest);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ users: [{ id: 'user-1', role: RepoRole.ADMIN }] });
    expect(mockRequireAuthz).toHaveBeenCalledWith(baseRequest, 'read', 'role', 'repo-1');
  });

  it('maps errors from requireAuthz to HTTP status codes', async () => {
    mockRequireAuthz.mockRejectedValueOnce(new Error('Unauthorized'));

    const res = await invoke(GET, baseRequest as unknown as NextRequest);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

describe('/api/repos/[repoId]/roles POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthz.mockResolvedValue({ userId: 'admin-1' });
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { userId: 'user-2', role: RepoRole.MEMBER },
    });
  });

  const request = jsonRequest('POST', { userId: 'user-2', role: RepoRole.MEMBER });

  it('validates payloads', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    const res = await expectValidationFailure(POST, request as unknown as NextRequest);
    expect(await res.json()).toEqual({ error: 'invalid', details: [] });
  });

  it('assigns roles when validation passes', async () => {
    await expectMutationSuccess({
      handler: POST,
      request: request as unknown as NextRequest,
      expectedBody: {
        message: 'Role assigned successfully',
        userId: 'user-2',
        role: RepoRole.MEMBER,
      },
      assertion: () =>
        expect(mockAssignRole).toHaveBeenCalledWith(
          'admin-1',
          'user-2',
          'repo-1',
          RepoRole.MEMBER,
          {
            ipAddress: '1.1.1.1',
          }
        ),
    });
  });
});

describe('/api/repos/[repoId]/roles DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthz.mockResolvedValue({ userId: 'admin-1' });
    mockValidateRequest.mockResolvedValue({
      success: true,
      data: { userId: 'user-2' },
    });
  });

  const request = jsonRequest('DELETE', { userId: 'user-2' });

  it('removes roles after validation', async () => {
    await expectMutationSuccess({
      handler: DELETE,
      request: request as unknown as NextRequest,
      expectedBody: {
        message: 'Role removed successfully',
        userId: 'user-2',
      },
      assertion: () =>
        expect(mockRemoveRole).toHaveBeenCalledWith('admin-1', 'user-2', 'repo-1', {
          ipAddress: '1.1.1.1',
        }),
    });
  });

  it('returns 400 when validation fails', async () => {
    mockValidateRequest.mockResolvedValueOnce({
      success: false,
      error: { error: 'invalid', details: [] },
    });

    await expectValidationFailure(DELETE, request as unknown as NextRequest);
  });
});
