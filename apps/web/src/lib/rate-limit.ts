
/**
 * Simple in-memory rate limiter (for G0)
 * In production, use Redis or a dedicated service
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  'auth:register': { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  'auth:login': { maxRequests: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
};

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Rate limit check
 */
export async function rateLimit(
  key: string,
  request: Request
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const limit = RATE_LIMITS[key];
  if (!limit) {
    return { allowed: true, headers: {} };
  }

  const clientId = getClientId(request);
  const storeKey = `${key}:${clientId}`;
  const now = Date.now();

  // Clean up expired entries (simple cleanup, not perfect)
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  const entry = rateLimitStore.get(storeKey);

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(storeKey, { count: 1, resetAt: now + limit.windowMs });
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': String(limit.maxRequests),
        'X-RateLimit-Remaining': String(limit.maxRequests - 1),
        'X-RateLimit-Reset': String(Math.floor((now + limit.windowMs) / 1000)),
      },
    };
  }

  if (entry.count >= limit.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': String(limit.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
      },
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': String(limit.maxRequests),
      'X-RateLimit-Remaining': String(limit.maxRequests - entry.count),
      'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
    },
  };
}
