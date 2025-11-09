/**
 * GitHub App Webhook Handler
 *
 * Handles GitHub App webhook events (installation, uninstallation, etc.)
 *
 * Story: ST-301
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractRequestContext } from '@/lib/server/audit-service';
import {
  upsertGitHubAppInstallation,
  deleteGitHubAppInstallation,
  syncRepositoriesFromInstallation,
  validateInstallationPermissions,
  type GitHubAppInstallationData,
} from '@/lib/server/github-app-service';
import { logger } from '@/lib/server/logger';
import { verifyGitHubWebhookSignature } from '@/lib/server/github-webhook';
import { clearInstallationTokenCache } from '@/lib/server/github-app-tokens';
import {
  triggerIngestionForWorkflowRun,
  triggerIngestionForCheckRun,
} from '@/lib/server/github-app-ingestion-trigger';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/github-app
 * Handles GitHub App webhook events
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request);

  try {
    // Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');

    if (!signature) {
      logger.warn('GitHub App webhook missing signature', {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify signature
    const isValid = await verifyGitHubWebhookSignature(body, signature);
    if (!isValid) {
      logger.warn('GitHub App webhook invalid signature', {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(body) as {
      action: string;
      installation?: GitHubAppInstallationData;
      installations?: GitHubAppInstallationData[];
    };

    logger.info('GitHub App webhook received', {
      event,
      action: payload.action,
      installationId: payload.installation?.id,
    });

    // Handle different event types
    switch (event) {
      case 'installation':
        await handleInstallationEvent(payload.action, payload.installation, context);
        break;

      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(
          payload.action,
          payload.installation,
          payload as { repositories_added?: unknown[]; repositories_removed?: unknown[] },
          context
        );
        break;

      case 'workflow_run':
        await handleWorkflowRunEvent(payload.action, payload as WorkflowRunPayload, context);
        break;

      case 'check_run':
        await handleCheckRunEvent(payload.action, payload as CheckRunPayload, context);
        break;

      default:
        logger.info('GitHub App webhook event not handled', {
          event,
          action: payload.action,
        });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('GitHub App webhook error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle installation created event
 */
async function handleInstallationCreated(
  installation: GitHubAppInstallationData,
  context: { ipAddress: string | null; userAgent: string | null }
) {
  await upsertGitHubAppInstallation(installation, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const validation = await validateInstallationPermissions(BigInt(installation.id));
  if (!validation.valid) {
    logger.warn('GitHub App installation has insufficient permissions', {
      installationId: installation.id,
      missing: validation.missing,
      warnings: validation.warnings,
    });
  }

  if (installation.repositories && installation.repositories.length > 0) {
    await syncRepositoriesFromInstallation(
      installation.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        owner: { login: repo.full_name.split('/')[0] },
        default_branch: undefined,
        private: false,
      })),
      {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      }
    );
  }
}

/**
 * Handle installation events (created, deleted, suspended, unsuspended)
 */
async function handleInstallationEvent(
  action: string,
  installation: GitHubAppInstallationData | undefined,
  context: { ipAddress: string | null; userAgent: string | null }
) {
  if (!installation) {
    logger.warn('GitHub App installation event missing installation data', {
      action,
    });
    return;
  }

  if (action === 'created') {
    await handleInstallationCreated(installation, context);
    return;
  }

  if (action === 'deleted') {
    await deleteGitHubAppInstallation(BigInt(installation.id), {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    clearInstallationTokenCache(BigInt(installation.id));
    return;
  }

  if (action === 'suspend' || action === 'unsuspend') {
    await upsertGitHubAppInstallation(installation, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return;
  }

  logger.info('GitHub App installation action not handled', { action });
}

/**
 * Handle installation_repositories events (added, removed)
 */
async function handleInstallationRepositoriesEvent(
  action: string,
  installation: GitHubAppInstallationData | undefined,
  payload: { repositories_added?: unknown[]; repositories_removed?: unknown[] },
  context: { ipAddress: string | null; userAgent: string | null }
) {
  if (!installation) {
    logger.warn('GitHub App installation_repositories event missing installation data', { action });
    return;
  }

  // Update installation with new repository list
  // GitHub sends the full installation object with updated repositories
  await upsertGitHubAppInstallation(installation, {
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  // Sync added repositories to our database
  if (payload.repositories_added && payload.repositories_added.length > 0) {
    const reposToSync = (
      payload.repositories_added as Array<{
        id: number;
        name: string;
        full_name: string;
        owner: { login: string };
        default_branch?: string;
        private: boolean;
      }>
    ).map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner || { login: repo.full_name.split('/')[0] },
      default_branch: repo.default_branch,
      private: repo.private ?? false,
    }));

    await syncRepositoriesFromInstallation(reposToSync, {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  logger.info('GitHub App installation repositories updated', {
    action,
    installationId: installation.id,
    repositoriesAdded: payload.repositories_added?.length ?? 0,
    repositoriesRemoved: payload.repositories_removed?.length ?? 0,
  });
}

/**
 * Workflow run payload structure from GitHub
 */
interface WorkflowRunPayload {
  action: 'requested' | 'completed' | 'in_progress';
  workflow_run: {
    id: number;
    name: string;
    head_branch: string;
    head_sha: string;
    run_number: number;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion:
      | 'success'
      | 'failure'
      | 'cancelled'
      | 'neutral'
      | 'skipped'
      | 'timed_out'
      | 'action_required'
      | null;
    workflow_id: number;
    repository: {
      id: number;
      name: string;
      full_name: string;
      owner: {
        login: string;
        id: number;
      };
    };
    head_commit?: {
      id: string;
      message: string;
    };
  };
  installation?: {
    id: number;
  };
}

/**
 * Check run payload structure from GitHub
 */
interface CheckRunPayload {
  action: 'created' | 'completed' | 'rerequested' | 'requested_action';
  check_run: {
    id: number;
    name: string;
    head_sha: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'skipped'
      | 'timed_out'
      | 'action_required'
      | null;
    check_suite: {
      id: number;
      head_sha: string;
      head_branch: string;
    };
    repository: {
      id: number;
      name: string;
      full_name: string;
      owner: {
        login: string;
        id: number;
      };
    };
  };
  installation?: {
    id: number;
  };
}

/**
 * Handle workflow_run events
 * Triggers when a GitHub Actions workflow run completes
 */
async function handleWorkflowRunEvent(
  action: string,
  payload: WorkflowRunPayload,
  context: { ipAddress: string | null; userAgent: string | null }
) {
  const { workflow_run, installation } = payload;

  if (!workflow_run) {
    logger.warn('GitHub App workflow_run event missing workflow_run data', { action });
    return;
  }

  // Only process completed workflow runs
  if (action !== 'completed' || workflow_run.status !== 'completed') {
    logger.debug('GitHub App workflow_run event skipped (not completed)', {
      action,
      status: workflow_run.status,
      workflowRunId: workflow_run.id,
    });
    return;
  }

  logger.info('GitHub App workflow_run completed', {
    action,
    workflowRunId: workflow_run.id,
    workflowName: workflow_run.name,
    repositoryId: workflow_run.repository.id,
    repositoryFullName: workflow_run.repository.full_name,
    headSha: workflow_run.head_sha,
    headBranch: workflow_run.head_branch,
    conclusion: workflow_run.conclusion,
    installationId: installation?.id,
  });

  // Trigger ingestion service to fetch test results
  if (installation?.id) {
    // Process asynchronously to avoid blocking webhook response
    triggerIngestionForWorkflowRun(
      workflow_run.id,
      workflow_run.repository.id,
      workflow_run.repository.full_name,
      workflow_run.head_sha,
      workflow_run.head_branch,
      installation.id,
      context
    ).catch((error) => {
      logger.error('Failed to trigger ingestion for workflow run', {
        workflowRunId: workflow_run.id,
        repositoryFullName: workflow_run.repository.full_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }
}

/**
 * Handle check_run events
 * Triggers when a GitHub Check Run completes (e.g., from GitHub Actions, third-party CI)
 */
async function handleCheckRunEvent(
  action: string,
  payload: CheckRunPayload,
  context: { ipAddress: string | null; userAgent: string | null }
) {
  const { check_run, installation } = payload;

  if (!check_run) {
    logger.warn('GitHub App check_run event missing check_run data', { action });
    return;
  }

  // Only process completed check runs
  if (action !== 'completed' || check_run.status !== 'completed') {
    logger.debug('GitHub App check_run event skipped (not completed)', {
      action,
      status: check_run.status,
      checkRunId: check_run.id,
    });
    return;
  }

  logger.info('GitHub App check_run completed', {
    action,
    checkRunId: check_run.id,
    checkRunName: check_run.name,
    repositoryId: check_run.repository.id,
    repositoryFullName: check_run.repository.full_name,
    headSha: check_run.head_sha,
    headBranch: check_run.check_suite.head_branch,
    conclusion: check_run.conclusion,
    installationId: installation?.id,
  });

  // Trigger ingestion service to fetch test results
  if (installation?.id) {
    // Process asynchronously to avoid blocking webhook response
    triggerIngestionForCheckRun(
      check_run.id,
      check_run.repository.id,
      check_run.repository.full_name,
      check_run.head_sha,
      check_run.check_suite.head_branch,
      installation.id,
      context
    ).catch((error) => {
      logger.error('Failed to trigger ingestion for check run', {
        checkRunId: check_run.id,
        repositoryFullName: check_run.repository.full_name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  }
}
