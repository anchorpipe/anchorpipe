/**
 * Brute force protection service
 * Tracks failed login attempts and locks accounts/IPs after repeated failures
 */
const failedAttemptsStore = new Map<
  string,
  { count: number; lockedUntil: number | null; lastAttempt: number }
>();

/**
 * Configuration for brute force protection
 * Can be overridden via environment variables:
 * - BRUTE_FORCE_MAX_ATTEMPTS (default: 5)
 * - BRUTE_FORCE_LOCK_DURATION_MS (default: 15 minutes)
 * - BRUTE_FORCE_WINDOW_MS (default: 15 minutes)
 */
const MAX_ATTEMPTS = parseInt(process.env.BRUTE_FORCE_MAX_ATTEMPTS || '5', 10);
const LOCK_DURATION_MS = parseInt(
  process.env.BRUTE_FORCE_LOCK_DURATION_MS || String(15 * 60 * 1000),
  10
);
const WINDOW_MS = parseInt(process.env.BRUTE_FORCE_WINDOW_MS || String(15 * 60 * 1000), 10);

/**
 * Get identifier for brute force tracking (IP or email)
 */
function getBruteForceKey(ip: string, email?: string): string {
  // Track by IP and email combination for better security
  return email ? `bf:${ip}:${email}` : `bf:${ip}`;
}

/**
 * Check if an IP/email is currently locked due to brute force attempts
 * @param ip - Client IP address
 * @param email - Optional email address
 * @returns Object with locked status and remaining lock time in seconds
 */
export function checkBruteForceLock(
  ip: string,
  email?: string
): { locked: boolean; retryAfter?: number } {
  const key = getBruteForceKey(ip, email);
  const entry = failedAttemptsStore.get(key);

  if (!entry) {
    return { locked: false };
  }

  const now = Date.now();

  // Check if still locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { locked: true, retryAfter };
  }

  // Lock expired, but check if we're still in the tracking window
  if (entry.lastAttempt + WINDOW_MS < now) {
    // Window expired, reset
    failedAttemptsStore.delete(key);
    return { locked: false };
  }

  // Not locked, but still tracking attempts
  return { locked: false };
}

/**
 * Record a failed login attempt
 * @param ip - Client IP address
 * @param email - Optional email address
 * @returns Object indicating if account is now locked and retry time
 */
export function recordFailedAttempt(
  ip: string,
  email?: string
): { locked: boolean; retryAfter?: number } {
  const key = getBruteForceKey(ip, email);
  const now = Date.now();
  const entry = failedAttemptsStore.get(key);

  if (!entry) {
    // First failed attempt
    failedAttemptsStore.set(key, {
      count: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
    return { locked: false };
  }

  // Check if window expired
  if (entry.lastAttempt + WINDOW_MS < now) {
    // Reset counter
    failedAttemptsStore.set(key, {
      count: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
    return { locked: false };
  }

  // Increment counter
  entry.count++;
  entry.lastAttempt = now;

  // Lock if max attempts reached
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_DURATION_MS;
    const retryAfter = Math.ceil(LOCK_DURATION_MS / 1000);
    return { locked: true, retryAfter };
  }

  return { locked: false };
}

/**
 * Clear failed attempts for an IP/email (e.g., after successful login)
 * @param ip - Client IP address
 * @param email - Optional email address
 */
export function clearFailedAttempts(ip: string, email?: string): void {
  const key = getBruteForceKey(ip, email);
  failedAttemptsStore.delete(key);
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of failedAttemptsStore.entries()) {
    // Remove if lock expired and window expired
    if (
      (!entry.lockedUntil || entry.lockedUntil < now) &&
      entry.lastAttempt + WINDOW_MS < now
    ) {
      failedAttemptsStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}

