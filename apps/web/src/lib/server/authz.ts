import { NextRequest, NextResponse } from 'next/server';
import { readSession } from './auth';
import { getUserAbility } from './rbac-service';
import type { AppAbility, PermissionAction, PermissionSubject } from '../rbac';

/**
 * Authorization context for a request
 */
export interface AuthzContext {
  userId: string;
  repoId: string;
  ability: AppAbility;
}

/**
 * Get authorization context from request
 * Returns null if user is not authenticated or repoId is missing
 */
export async function getAuthzContext(
  request: NextRequest,
  repoId?: string
): Promise<AuthzContext | null> {
  // Get user session
  const session = await readSession();
  const userId = session?.sub as string | undefined;
  if (!userId) {
    return null;
  }

  // Get repoId from query params or request body
  const queryRepoId = request.nextUrl.searchParams.get('repoId');
  const resolvedRepoId = repoId ?? queryRepoId;

  if (!resolvedRepoId) {
    return null;
  }

  // Get user's ability for this repo
  const ability = await getUserAbility(userId, resolvedRepoId);

  return {
    userId,
    repoId: resolvedRepoId,
    ability,
  };
}

/**
 * Require authorization for a request
 * Throws error if user is not authorized
 */
export async function requireAuthz(
  request: NextRequest,
  action: PermissionAction,
  subject: PermissionSubject,
  repoId?: string
): Promise<AuthzContext> {
  const context = await getAuthzContext(request, repoId);

  if (!context) {
    throw new Error('Unauthorized: authentication required');
  }

  if (!context.ability.can(action, subject)) {
    throw new Error(`Forbidden: cannot ${action} ${subject}`);
  }

  return context;
}

/**
 * Authorization middleware factory
 * Creates a middleware function that checks permissions
 */
export function createAuthzMiddleware(action: PermissionAction, subject: PermissionSubject) {
  return async (request: NextRequest, repoId?: string) => {
    try {
      return await requireAuthz(request, action, subject, repoId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      const status = message.includes('authentication') ? 401 : 403;
      return NextResponse.json({ error: message }, { status });
    }
  };
}
