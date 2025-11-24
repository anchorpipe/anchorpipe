import { describe, it, expect } from 'vitest';
import {
  MAX_CONTENT_SIZE,
  validateContentSize,
  sanitizePath,
  sanitizeString,
  updateTestStats,
} from '../utils';

describe('test-report parser utils', () => {
  describe('validateContentSize', () => {
    it('accepts payloads under limit', () => {
      const result = validateContentSize('ok');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects payloads over limit', () => {
      const large = 'a'.repeat(MAX_CONTENT_SIZE + 1);
      const result = validateContentSize(large);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Content too large');
    });
  });

  describe('sanitizePath', () => {
    it('removes traversal sequences and illegal chars', () => {
      const sanitized = sanitizePath('../..//my<>file?.xml');
      expect(sanitized).toBe('///myfile.xml');
    });

    it('falls back to "unknown" when result is empty', () => {
      const sanitized = sanitizePath('..');
      expect(sanitized).toBe('unknown');
    });

    it('truncates to max length', () => {
      const sanitized = sanitizePath('repo/'.padEnd(600, 'a'), 10);
      expect(sanitized.length).toBe(10);
    });
  });

  describe('sanitizeString', () => {
    it('limits string length', () => {
      const sanitized = sanitizeString('a'.repeat(20), 5);
      expect(sanitized).toBe('aaaaa');
    });

    it('returns string unchanged when below limit', () => {
      expect(sanitizeString('ok', 5)).toBe('ok');
    });
  });

  describe('updateTestStats', () => {
    it('increments counts per status', () => {
      const stats = { totalTests: 0, passed: 0, failed: 0, skipped: 0 };

      updateTestStats(stats, 'pass');
      updateTestStats(stats, 'fail');
      updateTestStats(stats, 'skip');

      expect(stats).toEqual({
        totalTests: 3,
        passed: 1,
        failed: 1,
        skipped: 1,
      });
    });
  });
});

