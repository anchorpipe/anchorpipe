import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { handleOAuthCallback } from '@/lib/oauth-service';

export const runtime = 'nodejs';

/**
 * GET /api/auth/callback/github
 * Handles GitHub OAuth callback after user authorization
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors from GitHub
  if (error) {
    console.error('GitHub OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `/?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`,
        request.url
      )
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/?error=invalid_request&message=Missing code or state', request.url)
    );
  }

  try {
    // Retrieve stored values from cookies
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
    const returnTo = cookieStore.get('oauth_return_to')?.value || '/dashboard';

    // Validate state (CSRF protection)
    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch');
      return NextResponse.redirect(
        new URL('/?error=invalid_state&message=State mismatch', request.url)
      );
    }

    if (!codeVerifier) {
      console.error('OAuth code verifier missing');
      return NextResponse.redirect(
        new URL('/?error=invalid_request&message=Code verifier missing', request.url)
      );
    }

    // Build redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback/github`;

    // Handle OAuth callback
    const result = await handleOAuthCallback({
      code,
      state,
      codeVerifier,
      redirectUri,
      request,
    });

    // Clear OAuth cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_code_verifier');
    cookieStore.delete('oauth_return_to');

    if (result.success) {
      // Redirect to dashboard or return URL
      return NextResponse.redirect(new URL(returnTo, request.url));
    } else {
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(
          `/?error=oauth_failed&message=${encodeURIComponent(result.error || 'OAuth failed')}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
    return NextResponse.redirect(
      new URL(`/?error=oauth_error&message=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
