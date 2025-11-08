import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkBruteForceLock,
  recordFailedAttempt,
  clearFailedAttempts,
  cleanupExpiredEntries,
} from '../brute-force';

describe('brute-force protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not lock on first failed attempt', () => {
    const result = recordFailedAttempt('192.168.1.1', 'user@example.com');
    expect(result.locked).toBe(false);
  });

  it('should lock after max attempts', () => {
    const ip = '192.168.1.2';
    const email = 'user@example.com';

    // Make 4 failed attempts (should not lock yet)
    for (let i = 0; i < 4; i++) {
      const result = recordFailedAttempt(ip, email);
      expect(result.locked).toBe(false);
    }

    // 5th attempt should lock
    const result = recordFailedAttempt(ip, email);
    expect(result.locked).toBe(true);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should check brute force lock correctly', () => {
    const ip = '192.168.1.3';
    const email = 'user@example.com';

    // Initially not locked
    let check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(false);

    // Lock after max attempts
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(ip, email);
    }

    // Should be locked
    check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(true);
    expect(check.retryAfter).toBeDefined();
  });

  it('should clear failed attempts on successful login', () => {
    const ip = '192.168.1.4';
    const email = 'user@example.com';

    // Make some failed attempts
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt(ip, email);
    }

    // Clear on successful login
    clearFailedAttempts(ip, email);

    // Should not be locked
    const check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(false);

    // Counter should be reset
    const result = recordFailedAttempt(ip, email);
    expect(result.locked).toBe(false);
  });

  it('should track by IP and email combination', () => {
    const ip = '192.168.1.5';
    const email1 = 'user1@example.com';
    const email2 = 'user2@example.com';

    // Make failed attempts for email1
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(ip, email1);
    }

    // email2 should not be locked
    let check = checkBruteForceLock(ip, email2);
    expect(check.locked).toBe(false);

    // email1 should not be locked yet (need 5 attempts)
    check = checkBruteForceLock(ip, email1);
    expect(check.locked).toBe(false);
  });

  it('should track by IP only when email not provided', () => {
    const ip = '192.168.1.6';

    // Make failed attempts without email
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(ip);
    }

    // Should not be locked yet
    let check = checkBruteForceLock(ip);
    expect(check.locked).toBe(false);

    // 5th attempt should lock
    recordFailedAttempt(ip);
    check = checkBruteForceLock(ip);
    expect(check.locked).toBe(true);
  });

  it('should reset window after expiration', () => {
    vi.useFakeTimers();

    const ip = '192.168.1.7';
    const email = 'user@example.com';

    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt(ip, email);
    }

    // Advance time past window (15 minutes + 1 second)
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // Should not be locked (window expired)
    let check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(false);

    // Counter should be reset
    const result = recordFailedAttempt(ip, email);
    expect(result.locked).toBe(false);

    vi.useRealTimers();
  });

  it('should cleanup expired entries', () => {
    vi.useFakeTimers();

    const ip1 = '192.168.1.8';
    const ip2 = '192.168.1.9';

    // Make failed attempts for both IPs
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt(ip1);
      recordFailedAttempt(ip2);
    }

    // Advance time past window
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

    // Cleanup expired entries
    cleanupExpiredEntries();

    // Both should be cleared
    let check1 = checkBruteForceLock(ip1);
    let check2 = checkBruteForceLock(ip2);
    expect(check1.locked).toBe(false);
    expect(check2.locked).toBe(false);

    vi.useRealTimers();
  });

  it('should respect lock duration', () => {
    vi.useFakeTimers();

    const ip = '192.168.1.10';
    const email = 'user@example.com';

    // Lock account
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(ip, email);
    }

    // Should be locked
    let check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(true);

    // Advance time but not past lock duration
    vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

    // Should still be locked
    check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(true);

    // Advance past lock duration (15 minutes)
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000); // 10 more minutes + 1 second

    // Should not be locked anymore
    check = checkBruteForceLock(ip, email);
    expect(check.locked).toBe(false);

    vi.useRealTimers();
  });
});

