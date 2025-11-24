/**
 * Simple in-memory rate limiter (for G0)
 * In production, use Redis or a dedicated service
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit configuration
 * Can be overridden via environment variables:
 * - RATE_LIMIT_AUTH_REGISTER (format: "maxRequests:windowMs")
 * - RATE_LIMIT_AUTH_LOGIN
 * - RATE_LIMIT_INGESTION_SUBMIT
 */
function getRateLimitConfig(
  key: string,
  defaultMaxRequests: number,
  defaultWindowMs: number
): { maxRequests: number; windowMs: number } {
  const envKey = `RATE_LIMIT_${key.toUpperCase().replace(':', '_')}`;
  const envValue = process.env[envKey];
  if (envValue) {
    const [maxRequests, windowMs] = envValue.split(':').map(Number);
    if (!isNaN(maxRequests) && !isNaN(windowMs)) {
      return { maxRequests, windowMs };
    }
  }
  return { maxRequests: defaultMaxRequests, windowMs: defaultWindowMs };
}

function buildRateLimitConfig(): Record<string, { maxRequests: number; windowMs: number }> {
  return {
    'auth:register': getRateLimitConfig('auth:register', 5, 15 * 60 * 1000), // 5 requests per 15 minutes
    'auth:login': getRateLimitConfig('auth:login', 10, 15 * 60 * 1000), // 10 requests per 15 minutes
    'ingestion:submit': getRateLimitConfig('ingestion:submit', 500, 60 * 60 * 1000), // 500 requests per hour
  };
}

let RATE_LIMITS = buildRateLimitConfig();

/**
 * Testing utility: recompute rate-limit config after mutating environment variables.
 */
export function refreshRateLimitConfigForTesting() {
  RATE_LIMITS = buildRateLimitConfig();
}

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
 * Check if IP is from a trusted source (for bypass rules)
 * Trusted sources can be configured via TRUSTED_IPS env var (comma-separated)
 */
function isTrustedSource(ip: string): boolean {
  const trustedIps = process.env.TRUSTED_IPS?.split(',').map((ip) => ip.trim()) || [];
  return trustedIps.includes(ip);
}

/**
 * Rate limit check
 * @param key - Rate limit key (e.g., 'auth:login')
 * @param request - Request object
 * @param logViolation - Optional callback to log violations (for audit logging)
 * @returns Rate limit result with headers including Retry-After on violations
 */
export async function rateLimit(
  key: string,
  request: Request,
  logViolation?: (ip: string, key: string) => void
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const limit = RATE_LIMITS[key];
  if (!limit) {
    return { allowed: true, headers: {} };
  }

  const clientId = getClientId(request);

  // Trusted sources bypass rate limiting (optional feature)
  if (isTrustedSource(clientId)) {
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': String(limit.maxRequests),
        'X-RateLimit-Remaining': String(limit.maxRequests),
        'X-RateLimit-Reset': String(Math.floor((Date.now() + limit.windowMs) / 1000)),
      },
    };
  }

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
    // Rate limit exceeded - calculate Retry-After header
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    if (logViolation) {
      logViolation(clientId, key);
    }
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': String(limit.maxRequests),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(entry.resetAt / 1000)),
        'Retry-After': String(retryAfter),
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
