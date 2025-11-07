import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const reqId =
    request.headers.get('x-request-id') ||
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random()}`;
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/dashboard')) {
    const hasSession = request.cookies.get('ap_session');
    if (!hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('from', pathname);
      const res = NextResponse.redirect(url);
      res.headers.set('x-request-id', reqId);
      return res;
    }
  }
  const res = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
  res.headers.set('x-request-id', reqId);
  // Set baseline security headers across the app
  res.headers.set('x-content-type-options', 'nosniff');
  res.headers.set('x-frame-options', 'DENY');
  res.headers.set('referrer-policy', 'no-referrer');
  res.headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=()');
  res.headers.set('cross-origin-opener-policy', 'same-origin');
  res.headers.set('cross-origin-resource-policy', 'same-origin');
  // Encourage HTTPS in production via HSTS (handled by edge/proxy ideally)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
  }
  // Apply a conservative CSP for API routes to avoid breaking Next dev UI
  if (pathname.startsWith('/api/')) {
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
    res.headers.set('content-security-policy', csp);
  }
  return res;
}

export const config = {
  matcher: ['/:path*'],
};
