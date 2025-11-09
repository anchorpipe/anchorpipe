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
