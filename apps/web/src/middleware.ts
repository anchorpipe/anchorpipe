import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function generateRequestId(request: NextRequest) {
  return (
    request.headers.get('x-request-id') ||
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random()}`
  );
}

function redirectToLogin(request: NextRequest, reqId: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('from', request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.headers.set('x-request-id', reqId);
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'strict-transport-security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

function maybeAttachApiCsp(pathname: string, response: NextResponse) {
  if (!pathname.startsWith('/api/')) return;
  const csp = [
    "default-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "object-src 'none'",
    "form-action 'self'",
  ].join('; ');
  response.headers.set('content-security-policy', csp);
}

export function middleware(request: NextRequest) {
  const reqId = generateRequestId(request);
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/dashboard')) {
    const hasSession = request.cookies.get('ap_session');
    if (!hasSession) {
      return redirectToLogin(request, reqId);
    }
  }
  const res = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
  res.headers.set('x-request-id', reqId);
  applySecurityHeaders(res);
  maybeAttachApiCsp(pathname, res);
  return res;
}

export const config = {
  matcher: ['/:path*'],
};
