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
  vi.fn(async () => ({ valid: true, missing: [] as string[], warnings: [] as string[] }))
);
const mockClearTokenCache = vi.hoisted(() => vi.fn());
const mockTriggerWorkflow = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockTriggerCheckRun = vi.hoisted(() => vi.fn(() => Promise.resolve()));
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

const baseWorkflowRun = {
  id: 555,
  name: 'ci',
  head_branch: 'main',
  head_sha: 'abc',
  run_number: 10,
  status: 'completed',
  conclusion: 'success',
  workflow_id: 1,
  repository: {
    id: 1,
    name: 'repo',
    full_name: 'acme/repo',
    owner: { login: 'acme', id: 1 },
  },
};

const baseCheckRun = {
  id: 44,
  name: 'lint',
  head_sha: 'abc',
  status: 'completed',
  conclusion: 'success',
  check_suite: { id: 1, head_sha: 'abc', head_branch: 'main' },
  repository: {
    id: 2,
    name: 'repo',
    full_name: 'acme/repo',
    owner: { login: 'acme', id: 1 },
  },
};

const dispatchWebhook = (payload: unknown, event: string) =>
  POST(
    buildRequest(JSON.stringify(payload), {
      'x-hub-signature-256': 'sha',
      'x-github-event': event,
    })
  );

function buildWorkflowRunPayload(
  overrides: {
    action?: string;
    workflow_run?: Partial<typeof baseWorkflowRun>;
  } = {}
) {
  const workflowRun = {
    ...baseWorkflowRun,
    ...overrides.workflow_run,
    repository: {
      ...baseWorkflowRun.repository,
      ...(overrides.workflow_run?.repository ?? {}),
    },
  };

  return {
    action: overrides.action ?? 'completed',
    workflow_run: workflowRun,
    installation: { id: 77 },
  };
}

function buildCheckRunPayload(
  overrides: {
    action?: string;
    check_run?: Partial<typeof baseCheckRun>;
  } = {}
) {
  const checkRun = {
    ...baseCheckRun,
    ...overrides.check_run,
    repository: {
      ...baseCheckRun.repository,
      ...(overrides.check_run?.repository ?? {}),
    },
  };

  return {
    action: overrides.action ?? 'completed',
    check_run: checkRun,
    installation: { id: 77 },
  };
}

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

  it('handles installation deleted events and clears token cache', async () => {
    const payload = {
      action: 'deleted',
      installation: { id: 42, account: { login: 'acme' } },
    };

    const res = await POST(
      buildRequest(JSON.stringify(payload), {
        'x-hub-signature-256': 'sha',
        'x-github-event': 'installation',
      })
    );

    expect(res.status).toBe(200);
    expect(mockDeleteInstallation).toHaveBeenCalledWith(42n, expect.any(Object));
    expect(mockClearTokenCache).toHaveBeenCalledWith(42n);
  });

  it('handles new permissions accepted events and logs warnings', async () => {
    mockValidatePermissions.mockResolvedValueOnce({
      valid: false,
      missing: ['checks'],
      warnings: [],
    });
    const payload = {
      action: 'new_permissions_accepted',
      installation: { id: 99, account: { login: 'acme' } },
    };

    const res = await POST(
      buildRequest(JSON.stringify(payload), {
        'x-hub-signature-256': 'sha',
        'x-github-event': 'installation',
      })
    );

    expect(res.status).toBe(200);
    expect(mockValidatePermissions).toHaveBeenCalledWith(BigInt(99));
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'GitHub App installation has insufficient permissions after update',
      expect.objectContaining({ missing: ['checks'] })
    );
  });

  it('syncs repositories on installation_repositories events', async () => {
    const payload = {
      action: 'added',
      installation: { id: 101, repositories: [] },
      repositories_added: [
        {
          id: 1,
          name: 'repo',
          full_name: 'acme/repo',
          owner: { login: 'acme' },
          private: true,
        },
      ],
      repositories_removed: [],
    };

    const res = await POST(
      buildRequest(JSON.stringify(payload), {
        'x-hub-signature-256': 'sha',
        'x-github-event': 'installation_repositories',
      })
    );

    expect(res.status).toBe(200);
    expect(mockSyncRepos).toHaveBeenCalledWith(
      [
        {
          id: 1,
          name: 'repo',
          full_name: 'acme/repo',
          owner: { login: 'acme' },
          default_branch: undefined,
          private: true,
        },
      ],
      expect.any(Object)
    );
  });

  it('triggers ingestion for completed workflow runs', async () => {
    const res = await dispatchWebhook(buildWorkflowRunPayload(), 'workflow_run');

    expect(res.status).toBe(200);
    expect(mockTriggerWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowRunId: 555,
        repository: { id: 1, fullName: 'acme/repo' },
      })
    );
  });

  it('skips non-completed workflow runs', async () => {
    const res = await dispatchWebhook(
      buildWorkflowRunPayload({
        action: 'requested',
        workflow_run: { id: 1, run_number: 1, status: 'in_progress', conclusion: undefined },
      }),
      'workflow_run'
    );

    expect(res.status).toBe(200);
    expect(mockTriggerWorkflow).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'GitHub App workflow_run event skipped (not completed)',
      expect.objectContaining({ runId: 1 })
    );
  });

  it('triggers ingestion for completed check runs', async () => {
    const res = await dispatchWebhook(buildCheckRunPayload(), 'check_run');

    expect(res.status).toBe(200);
    expect(mockTriggerCheckRun).toHaveBeenCalledWith(
      expect.objectContaining({
        checkRunId: 44,
        repository: { id: 2, fullName: 'acme/repo' },
      })
    );
  });

  it('logs unhandled events', async () => {
    const res = await POST(
      buildRequest(JSON.stringify({ action: 'opened' }), {
        'x-hub-signature-256': 'sha',
        'x-github-event': 'issues',
      })
    );

    expect(res.status).toBe(200);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'GitHub App webhook event not handled',
      expect.objectContaining({ event: 'issues', action: 'opened' })
    );
  });
});
