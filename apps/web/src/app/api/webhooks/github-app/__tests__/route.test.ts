import { describe, beforeEach, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { buildNextRequest } from '@/test-utils/build-next-request';

const mockExtractRequestContext = vi.hoisted(() =>
  vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  }))
);
const mockVerifySignature = vi.hoisted(() => vi.fn());
const mockUpsert = vi.hoisted(() => vi.fn());
const mockDeleteInstallation = vi.hoisted(() => vi.fn());
const mockSyncRepos = vi.hoisted(() => vi.fn());
const mockValidatePermissions = vi.hoisted(() =>
  vi.fn(async () => ({ valid: true, missing: [], warnings: [] }))
);
const mockClearTokenCache = vi.hoisted(() => vi.fn());
const mockTriggerWorkflow = vi.hoisted(() => vi.fn());
const mockTriggerCheckRun = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('@/lib/server/audit-service', () => ({
  extractRequestContext: mockExtractRequestContext,
}));

vi.mock('@/lib/server/github-webhook', () => ({
  verifyGitHubWebhookSignature: mockVerifySignature,
}));

vi.mock('@/lib/server/github-app-service', () => ({
  upsertGitHubAppInstallation: mockUpsert,
  deleteGitHubAppInstallation: mockDeleteInstallation,
  syncRepositoriesFromInstallation: mockSyncRepos,
  validateInstallationPermissions: mockValidatePermissions,
}));

vi.mock('@/lib/server/github-app-tokens', () => ({
  clearInstallationTokenCache: mockClearTokenCache,
}));

vi.mock('@/lib/server/github-app-ingestion-trigger', () => ({
  triggerIngestionForWorkflowRun: mockTriggerWorkflow,
  triggerIngestionForCheckRun: mockTriggerCheckRun,
}));

vi.mock('@/lib/server/logger', () => ({
  logger: mockLogger,
}));

const buildRequest = (body: string, headers: Record<string, string> = {}) =>
  buildNextRequest('http://localhost/api/webhooks/github-app', {
    method: 'POST',
    body,
    headers,
  });

describe('/api/webhooks/github-app POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySignature.mockResolvedValue(true);
  });

  it('rejects requests without webhook signature', async () => {
    const res = await POST(buildRequest(JSON.stringify({ action: 'created' })));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid or missing signature' });
    expect(mockVerifySignature).not.toHaveBeenCalled();
  });

  it('rejects requests with invalid signature', async () => {
    mockVerifySignature.mockResolvedValueOnce(false);
    const res = await POST(
      buildRequest(JSON.stringify({ action: 'created' }), {
        'x-hub-signature-256': 'sha256=deadbeef',
      })
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Invalid or missing signature' });
  });

  it('handles installation created events and syncs repositories', async () => {
    const payload = {
      action: 'created',
      installation: {
        id: 123,
        account: { login: 'acme' },
        repositories: [
          {
            id: 1,
            name: 'repo',
            full_name: 'acme/repo',
          },
        ],
      },
    };

    const res = await POST(
      buildRequest(JSON.stringify(payload), {
        'x-hub-signature-256': 'sha',
        'x-github-event': 'installation',
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(mockUpsert).toHaveBeenCalledWith(payload.installation, {
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });
    expect(mockValidatePermissions).toHaveBeenCalledWith(BigInt(123));
    expect(mockSyncRepos).toHaveBeenCalledWith(
      [
        {
          id: 1,
          name: 'repo',
          full_name: 'acme/repo',
          owner: { login: 'acme' },
          default_branch: undefined,
          private: false,
        },
      ],
      {
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
      }
    );
  });

  it('returns 500 when a handler throws', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('db down'));

    const res = await POST(
      buildRequest(
        JSON.stringify({
          action: 'created',
          installation: { id: 1, account: { login: 'acme' } },
        }),
        {
          'x-hub-signature-256': 'sha',
          'x-github-event': 'installation',
        }
      )
    );

    expect(res.status).toBe(500);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
