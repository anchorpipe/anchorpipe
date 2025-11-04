import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

export function middleware(request: NextRequest) {
  const reqId = request.headers.get('x-request-id') || randomUUID();
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
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
