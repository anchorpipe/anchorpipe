import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, refreshRateLimitConfigForTesting } from '../rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    vi.clearAllMocks();
  delete process.env.RATE_LIMIT_AUTH_LOGIN;
  delete process.env.TRUSTED_IPS;
  refreshRateLimitConfigForTesting();
  });

  it('should allow requests within limit', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    // First 10 requests should be allowed
    for (let i = 0; i < 10; i++) {
      const result = await rateLimit('auth:login', request);
      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('10');
      expect(parseInt(result.headers['X-RateLimit-Remaining'] || '0')).toBeGreaterThanOrEqual(0);
    }
  });

  it('should reject requests exceeding limit', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.2' },
    });

    // Make 11 requests (limit is 10)
    for (let i = 0; i < 10; i++) {
      await rateLimit('auth:login', request);
    }

    const result = await rateLimit('auth:login', request);
    expect(result.allowed).toBe(false);
    expect(result.headers['X-RateLimit-Remaining']).toBe('0');
    expect(result.headers['Retry-After']).toBeDefined();
    expect(parseInt(result.headers['Retry-After'] || '0')).toBeGreaterThan(0);
  });

  it('should include Retry-After header on violation', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.3' },
    });

    // Exceed limit
    for (let i = 0; i < 11; i++) {
      await rateLimit('auth:login', request);
    }

    const result = await rateLimit('auth:login', request);
    expect(result.allowed).toBe(false);
    expect(result.headers['Retry-After']).toBeDefined();
    const retryAfter = parseInt(result.headers['Retry-After'] || '0');
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(900); // Should be <= 15 minutes
  });

  it('should call logViolation callback on violation', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.4' },
    });

    const logViolation = vi.fn();

    // Exceed limit
    for (let i = 0; i < 11; i++) {
      await rateLimit('auth:login', request, logViolation);
    }

    expect(logViolation).toHaveBeenCalledWith('192.168.1.4', 'auth:login');
  });

  it('should reset window after expiration', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.5' },
    });

    // Exceed limit
    for (let i = 0; i < 11; i++) {
      await rateLimit('auth:login', request);
    }

    // Wait for window to expire (mock time)
    vi.useFakeTimers();
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000); // 15 minutes + 1 second

    const result = await rateLimit('auth:login', request);
    expect(result.allowed).toBe(true);

    vi.useRealTimers();
  });

  it('should allow requests for unknown rate limit keys', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.6' },
    });

    const result = await rateLimit('unknown:key', request);
    expect(result.allowed).toBe(true);
    expect(result.headers).toEqual({});
  });

  it('should bypass rate limiting for trusted sources', async () => {
    // Set trusted IP
    process.env.TRUSTED_IPS = '192.168.1.7';

    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.7' },
    });

    // Make many requests - should all be allowed
    for (let i = 0; i < 20; i++) {
      const result = await rateLimit('auth:login', request);
      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Remaining']).toBe('10'); // Always shows full limit
    }

    delete process.env.TRUSTED_IPS;
  });

  it('should use environment variable configuration', async () => {
    process.env.RATE_LIMIT_AUTH_LOGIN = '20:1800000'; // 20 requests per 30 minutes
    refreshRateLimitConfigForTesting();

    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.8' },
    });

    // First 20 requests should be allowed
    for (let i = 0; i < 20; i++) {
      const result = await rateLimit('auth:login', request);
      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('20');
    }

    // 21st request should be rejected
    const result = await rateLimit('auth:login', request);
    expect(result.allowed).toBe(false);

    delete process.env.RATE_LIMIT_AUTH_LOGIN;
    refreshRateLimitConfigForTesting();
  });

  it('should handle different rate limits for different endpoints', async () => {
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.9' },
    });

    // auth:register has limit of 5
    for (let i = 0; i < 5; i++) {
      const result = await rateLimit('auth:register', request);
      expect(result.allowed).toBe(true);
      expect(result.headers['X-RateLimit-Limit']).toBe('5');
    }

    const result = await rateLimit('auth:register', request);
    expect(result.allowed).toBe(false);
  });
});
