import { PrismaClient } from '@anchorpipe/database';
import {
  exchangeCodeForToken,
  fetchGitHubUser,
  getGitHubClientId,
  getGitHubClientSecret,
  type GitHubUser,
  type GitHubTokenResponse,
} from './oauth';
import { encryptField } from './secrets';
import { createSessionJwt, setSessionCookie } from './auth';
import { writeAuditLog, AUDIT_ACTIONS, AUDIT_SUBJECTS } from './audit-service';
import { extractRequestContext } from './audit-service';
import type { NextRequest } from 'next/server';

const prisma = new PrismaClient();

export interface OAuthCallbackResult {
  success: boolean;
  userId?: string;
  error?: string;
  returnTo?: string;
}

interface OAuthAccountData {
  provider: string;
  providerAccountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number | null;
  scope: string;
}

interface OAuthContext {
  githubUser: GitHubUser;
  tokenResponse: GitHubTokenResponse;
  request: NextRequest;
}

function buildAccountData(
  provider: string,
  providerAccountId: string,
  tokenResponse: GitHubTokenResponse
): OAuthAccountData {
  return {
    provider,
    providerAccountId,
    accessToken: encryptField(tokenResponse.access_token),
    refreshToken: encryptField(tokenResponse.refresh_token || null),
    tokenType: tokenResponse.token_type,
    expiresAt: tokenResponse.expires_in
      ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
      : null,
    scope: tokenResponse.scope,
  };
}

interface UpdateAccountParams {
  accountId: string;
  userId: string;
  githubUser: GitHubUser;
  accountData: OAuthAccountData;
  context: OAuthContext;
}

async function updateExistingAccount(params: UpdateAccountParams): Promise<OAuthCallbackResult> {
  const { accountId, userId, githubUser, accountData, context } = params;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      accessToken: accountData.accessToken,
      refreshToken: accountData.refreshToken,
      tokenType: accountData.tokenType,
      expiresAt: accountData.expiresAt,
      scope: accountData.scope,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: githubUser.name || user?.name || null,
      email: githubUser.email || user?.email || null,
      githubId: accountData.providerAccountId,
      lastLoginAt: new Date(),
    },
  });

  const requestContext = extractRequestContext(context.request);
  await writeAuditLog({
    actorId: userId,
    action: AUDIT_ACTIONS.loginSuccess,
    subject: AUDIT_SUBJECTS.user,
    subjectId: userId,
    description: 'User logged in via GitHub OAuth.',
    metadata: {
      provider: accountData.provider,
      githubId: accountData.providerAccountId,
      login: githubUser.login,
    },
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { success: true, userId };
}

async function linkAccountToUser(
  user: { id: string },
  accountData: OAuthAccountData,
  context: OAuthContext
): Promise<OAuthCallbackResult> {
  await prisma.account.create({
    data: {
      userId: user.id,
      ...accountData,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      githubId: accountData.providerAccountId,
      lastLoginAt: new Date(),
    },
  });

  const requestContext = extractRequestContext(context.request);
  await writeAuditLog({
    actorId: user.id,
    action: AUDIT_ACTIONS.loginSuccess,
    subject: AUDIT_SUBJECTS.user,
    subjectId: user.id,
    description: 'User logged in via GitHub OAuth (account linked).',
    metadata: {
      provider: accountData.provider,
      githubId: accountData.providerAccountId,
      login: context.githubUser.login,
    },
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { success: true, userId: user.id };
}

async function createNewUserAndAccount(
  accountData: OAuthAccountData,
  context: OAuthContext
): Promise<OAuthCallbackResult> {
  const githubId = accountData.providerAccountId;
  const user = await prisma.user.create({
    data: {
      email: context.githubUser.email || `github-${githubId}@anchorpipe.local`,
      name: context.githubUser.name || context.githubUser.login,
      githubId,
      lastLoginAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      ...accountData,
    },
  });

  const requestContext = extractRequestContext(context.request);
  await writeAuditLog({
    actorId: user.id,
    action: AUDIT_ACTIONS.userCreated,
    subject: AUDIT_SUBJECTS.user,
    subjectId: user.id,
    description: 'User created via GitHub OAuth.',
    metadata: {
      provider: accountData.provider,
      githubId,
      login: context.githubUser.login,
    },
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  await writeAuditLog({
    actorId: user.id,
    action: AUDIT_ACTIONS.loginSuccess,
    subject: AUDIT_SUBJECTS.user,
    subjectId: user.id,
    description: 'User logged in via GitHub OAuth.',
    metadata: {
      provider: accountData.provider,
      githubId,
      login: context.githubUser.login,
    },
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
  });

  return { success: true, userId: user.id };
}

/**
 * Link or create user account from GitHub OAuth
 */
export async function linkOrCreateGitHubAccount(
  githubUser: GitHubUser,
  tokenResponse: GitHubTokenResponse,
  request: NextRequest
): Promise<OAuthCallbackResult> {
  const githubId = String(githubUser.id);
  const provider = 'github';
  const context: OAuthContext = { githubUser, tokenResponse, request };
  const accountData = buildAccountData(provider, githubId, tokenResponse);

  try {
    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: githubId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      return await updateExistingAccount({
        accountId: existingAccount.id,
        userId: existingAccount.userId,
        githubUser,
        accountData,
        context,
      });
    }

    // Check if user exists by email (link account)
    const existingUser = githubUser.email
      ? await prisma.user.findFirst({
          where: { email: githubUser.email },
        })
      : null;

    if (existingUser) {
      return await linkAccountToUser(existingUser, accountData, context);
    }

    // Create new user and account
    return await createNewUserAndAccount(accountData, context);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const requestContext = extractRequestContext(request);
    await writeAuditLog({
      action: AUDIT_ACTIONS.loginFailure,
      subject: AUDIT_SUBJECTS.security,
      description: `GitHub OAuth account linking failed: ${errorMessage}`,
      metadata: { provider, githubId, error: errorMessage },
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
  codeVerifier: string;
  redirectUri: string;
  request: NextRequest;
}

/**
 * Handle OAuth callback: exchange code for token, fetch user, link/create account
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams
): Promise<OAuthCallbackResult> {
  const { code, codeVerifier, redirectUri, request } = params;
  try {
    const clientId = getGitHubClientId();
    const clientSecret = getGitHubClientSecret();

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier,
    });

    // Fetch user profile
    const githubUser = await fetchGitHubUser(tokenResponse.access_token);

    // Link or create account
    const result = await linkOrCreateGitHubAccount(githubUser, tokenResponse, request);

    if (result.success && result.userId) {
      // Create session
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
        select: { id: true, email: true },
      });

      if (user) {
        const token = await createSessionJwt({
          sub: result.userId,
          email: user.email || undefined,
        });
        await setSessionCookie(token);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
