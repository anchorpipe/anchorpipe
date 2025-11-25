import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getRateLimitInfo,
  RateLimitError,
  type RateLimitConfig,
} from '@/lib/server/rate-limit';

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/ingestion': {
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_INGESTION || '100', 10),
    keyPrefix: 'rl:ingestion',
  },
  '/api/auth': {
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH || '10', 10),
    keyPrefix: 'rl:auth',
  },
  '/api/webhooks': {
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_WEBHOOKS || '60', 10),
    keyPrefix: 'rl:webhooks',
  },
  default: {
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_DEFAULT || '60', 10),
    keyPrefix: 'rl:api',
  },
};

function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.startsWith('/api/ingestion')) {
    return RATE_LIMITS['/api/ingestion'];
  }
  if (pathname.startsWith('/api/auth')) {
    return RATE_LIMITS['/api/auth'];
  }
  if (pathname.startsWith('/api/webhooks')) {
    return RATE_LIMITS['/api/webhooks'];
  }
  return RATE_LIMITS.default;
}

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

function finalizeResponse(response: NextResponse, pathname: string, reqId: string) {
  response.headers.set('x-request-id', reqId);
  applySecurityHeaders(response);
  maybeAttachApiCsp(pathname, response);
  return response;
}

export async function middleware(request: NextRequest) {
  const reqId = generateRequestId(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const hasSession = request.cookies.get('ap_session');
    if (!hasSession) {
      return redirectToLogin(request, reqId);
    }
  }

  if (pathname === '/api/health' || pathname === '/api/metrics') {
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
    return finalizeResponse(response, pathname, reqId);
  }

  if (pathname.startsWith('/api/')) {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip =
      forwarded?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    const config = getRateLimitConfig(pathname);
    const rateLimitKey = `${ip}:${pathname}`;

    try {
      await checkRateLimit(rateLimitKey, config);
      const limitInfo = await getRateLimitInfo(rateLimitKey, config);

      const response = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
      response.headers.set('X-RateLimit-Limit', limitInfo.limit.toString());
      response.headers.set('X-RateLimit-Remaining', limitInfo.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(limitInfo.reset).toISOString());
      return finalizeResponse(response, pathname, reqId);
    } catch (error) {
      if (error instanceof RateLimitError) {
        const retryAfter = error.retryAfter.toString();
        const response = NextResponse.json(
          { error: { code: 'RATE_LIMIT_EXCEEDED', message: error.message } },
          {
            status: 429,
            headers: {
              'X-Request-ID': reqId,
              'Retry-After': retryAfter,
            },
          }
        );
        applySecurityHeaders(response);
        maybeAttachApiCsp(pathname, response);
        return response;
      }

      console.error('[Middleware] Unexpected rate limit error:', error);
      const response = NextResponse.next({
        request: {
          headers: new Headers(request.headers),
        },
      });
      return finalizeResponse(response, pathname, reqId);
    }
  }

  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });
  return finalizeResponse(response, pathname, reqId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
