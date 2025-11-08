import { NextRequest, NextResponse } from 'next/server';
import { buildGitHubAuthUrl, generateCodeVerifier, generateState } from '@/lib/server/oauth';
import { getGitHubClientId } from '@/lib/server/oauth';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

/**
 * GET /api/auth/oauth/github
 * Initiates GitHub OAuth flow by redirecting to GitHub authorization page
 */
export async function GET(request: NextRequest) {
  try {
    let clientId: string;
    try {
      clientId = getGitHubClientId();
    } catch (error) {
      // During build time, env vars may not be set
      if (process.env.NODE_ENV === 'production' && !process.env.GITHUB_CLIENT_ID) {
        return NextResponse.json(
          { error: 'GitHub OAuth is not configured' },
          { status: 503 }
        );
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('return_to') || '/dashboard';

    // Generate PKCE code verifier and state
    const codeVerifier = generateCodeVerifier();
    const state = generateState();

    // Build redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/github`;

    // Store code verifier and state in secure, httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });
    cookieStore.set('oauth_return_to', returnTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    // Build GitHub OAuth URL
    const authUrl = buildGitHubAuthUrl({
      clientId,
      redirectUri,
      codeVerifier,
      state,
      returnTo,
    });

    // Redirect to GitHub
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('OAuth initiation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'OAuth initiation failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

