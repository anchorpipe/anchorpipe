/**
 * Test Report Parser Utilities
 *
 * Shared utilities for test report parsers.
 *
 * Story: ST-304
 */

/**
 * Maximum content size for parsing (50MB)
 */
export const MAX_CONTENT_SIZE = 50 * 1024 * 1024;

/**
 * Validate content size
 */
export function validateContentSize(content: string): { valid: boolean; error?: string } {
  if (content.length > MAX_CONTENT_SIZE) {
    return {
      valid: false,
      error: `Content too large. Maximum size is ${MAX_CONTENT_SIZE} bytes.`,
    };
  }
  return { valid: true };
}

/**
 * Sanitize path to prevent path traversal attacks
 */
export function sanitizePath(path: string, maxLength = 500): string {
  // Remove path traversal sequences and dangerous characters
  let sanitized = path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized || 'unknown';
}

/**
 * Sanitize string to prevent excessive length
 */
export function sanitizeString(str: string, maxLength = 500): string {
  if (str.length > maxLength) {
    return str.substring(0, maxLength);
  }
  return str;
}

/**
 * Update test statistics
 */
export function updateTestStats(
  stats: { totalTests: number; passed: number; failed: number; skipped: number },
  status: 'pass' | 'fail' | 'skip'
): void {
  stats.totalTests++;
  if (status === 'pass') stats.passed++;
  else if (status === 'fail') stats.failed++;
  else if (status === 'skip') stats.skipped++;
}
