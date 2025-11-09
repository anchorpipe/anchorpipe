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
 * Verify webhook signature and return body if valid
 */
async function verifyWebhookSignature(
  request: NextRequest,
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<{ body: string; event: string } | null> {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const event = request.headers.get('x-github-event');

  if (!signature) {
    logger.warn('GitHub App webhook missing signature', {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return null;
  }

  const isValid = await verifyGitHubWebhookSignature(body, signature);
  if (!isValid) {
    logger.warn('GitHub App webhook invalid signature', {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
    return null;
  }

  return { body, event: event || '' };
}

/**
 * Parse webhook payload
 */
function parseWebhookPayload(body: string): {
  action: string;
  installation?: GitHubAppInstallationData;
  installations?: GitHubAppInstallationData[];
} {
  return JSON.parse(body) as {
    action: string;
    installation?: GitHubAppInstallationData;
    installations?: GitHubAppInstallationData[];
  };
}

/**
 * Route webhook event to appropriate handler
 */
async function routeWebhookEvent(
  event: string | null,
  payload: {
    action: string;
    installation?: GitHubAppInstallationData;
    installations?: GitHubAppInstallationData[];
  },
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<void> {
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
}

/**
 * POST /api/webhooks/github-app
 * Handles GitHub App webhook events
 */
export async function POST(request: NextRequest) {
  const context = extractRequestContext(request);

  try {
    // Verify webhook signature
    const verification = await verifyWebhookSignature(request, context);
    if (!verification) {
      return NextResponse.json({ error: 'Invalid or missing signature' }, { status: 401 });
    }

    const { body, event } = verification;

    // Parse webhook payload
    const payload = parseWebhookPayload(body);

    logger.info('GitHub App webhook received', {
      event,
      action: payload.action,
      installationId: payload.installation?.id,
    });

    // Route to appropriate handler
    await routeWebhookEvent(event, payload, context);

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

  // Handle suspend/unsuspend actions (GitHub API terms)
  // cSpell:ignore unsuspend
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
  // cSpell:ignore rerequested
  // GitHub API action types: 'rerequested' is a valid GitHub API term
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
 * Check if workflow run should be processed
 */
function shouldProcessWorkflowRun(
  action: string,
  workflowRun: WorkflowRunPayload['workflow_run']
): boolean {
  return action === 'completed' && workflowRun.status === 'completed';
}

/**
 * Trigger ingestion for completed workflow run (async, non-blocking)
 */
function triggerWorkflowRunIngestion(
  workflowRun: WorkflowRunPayload['workflow_run'],
  installationId: number,
  context: { ipAddress: string | null; userAgent: string | null }
): void {
  triggerIngestionForWorkflowRun({
    workflowRunId: workflowRun.id,
    repositoryId: workflowRun.repository.id,
    repositoryFullName: workflowRun.repository.full_name,
    headSha: workflowRun.head_sha,
    headBranch: workflowRun.head_branch,
    installationId,
    metadata: context,
  }).catch((error) => {
    logger.error('Failed to trigger ingestion for workflow run', {
      workflowRunId: workflowRun.id,
      repositoryFullName: workflowRun.repository.full_name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}

/**
 * Validate and log run event (workflow or check run)
 */
function validateAndLogRunEvent<T extends { id: number; status: string }>(params: {
  run: T | undefined;
  runType: 'workflow_run' | 'check_run';
  action: string;
  shouldProcess: (action: string, run: T) => boolean;
  logInfo: (run: T, action: string, installationId?: number) => void;
}): T | null {
  const { run, runType, action, shouldProcess, logInfo } = params;

  if (!run) {
    logger.warn(`GitHub App ${runType} event missing ${runType} data`, { action });
    return null;
  }

  if (!shouldProcess(action, run)) {
    logger.debug(`GitHub App ${runType} event skipped (not completed)`, {
      action,
      status: run.status,
      runId: run.id,
    });
    return null;
  }

  return run;
}

/**
 * Handle workflow_run events
 * Triggers when a GitHub Actions workflow run completes
 */
async function handleWorkflowRunEvent(
  action: string,
  payload: WorkflowRunPayload,
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<void> {
  const { workflow_run, installation } = payload;

  const validatedRun = validateAndLogRunEvent({
    run: workflow_run,
    runType: 'workflow_run',
    action,
    shouldProcess: shouldProcessWorkflowRun,
    logInfo: (run, act, instId) => {
      logger.info('GitHub App workflow_run completed', {
        action: act,
        workflowRunId: run.id,
        workflowName: run.name,
        repositoryId: run.repository.id,
        repositoryFullName: run.repository.full_name,
        headSha: run.head_sha,
        headBranch: run.head_branch,
        conclusion: run.conclusion,
        installationId: instId,
      });
    },
  });

  if (!validatedRun) {
    return;
  }

  // Trigger ingestion service to fetch test results
  if (installation?.id) {
    triggerWorkflowRunIngestion(validatedRun, installation.id, context);
  }
}

/**
 * Check if check run should be processed
 */
function shouldProcessCheckRun(action: string, checkRun: CheckRunPayload['check_run']): boolean {
  return action === 'completed' && checkRun.status === 'completed';
}

/**
 * Trigger ingestion for completed check run (async, non-blocking)
 */
function triggerCheckRunIngestion(
  checkRun: CheckRunPayload['check_run'],
  installationId: number,
  context: { ipAddress: string | null; userAgent: string | null }
): void {
  triggerIngestionForCheckRun({
    checkRunId: checkRun.id,
    repositoryId: checkRun.repository.id,
    repositoryFullName: checkRun.repository.full_name,
    headSha: checkRun.head_sha,
    headBranch: checkRun.check_suite.head_branch,
    installationId,
    metadata: context,
  }).catch((error) => {
    logger.error('Failed to trigger ingestion for check run', {
      checkRunId: checkRun.id,
      repositoryFullName: checkRun.repository.full_name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  });
}

/**
 * Handle check_run events
 * Triggers when a GitHub Check Run completes (e.g., from GitHub Actions, third-party CI)
 */
async function handleCheckRunEvent(
  action: string,
  payload: CheckRunPayload,
  context: { ipAddress: string | null; userAgent: string | null }
): Promise<void> {
  const { check_run, installation } = payload;

  const validatedRun = validateAndLogRunEvent({
    run: check_run,
    runType: 'check_run',
    action,
    shouldProcess: shouldProcessCheckRun,
    logInfo: (run, act, instId) => {
      logger.info('GitHub App check_run completed', {
        action: act,
        checkRunId: run.id,
        checkRunName: run.name,
        repositoryId: run.repository.id,
        repositoryFullName: run.repository.full_name,
        headSha: run.head_sha,
        headBranch: run.check_suite.head_branch,
        conclusion: run.conclusion,
        installationId: instId,
      });
    },
  });

  if (!validatedRun) {
    return;
  }

  // Trigger ingestion service to fetch test results
  if (installation?.id) {
    triggerCheckRunIngestion(validatedRun, installation.id, context);
  }
}
