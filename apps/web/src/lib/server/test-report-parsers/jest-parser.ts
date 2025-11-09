/**
 * Jest Test Report Parser
 *
 * Parses Jest JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';

/**
 * Jest assertion result format
 */
interface JestAssertionResult {
  ancestorTitles: string[];
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped' | 'todo';
  title: string;
  duration?: number;
  failureMessages?: string[];
}

/**
 * Jest test result format
 */
interface JestTestResult {
  assertionResults?: JestAssertionResult[];
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  startTime?: number;
  endTime?: number;
}

/**
 * Jest JSON report format (can be array or single object)
 */
type JestReport = JestTestResult | JestTestResult[];

/**
 * Jest test report parser
 */
export class JestParser implements TestReportParser {
  framework = 'jest';

  async parse(content: string): Promise<ParseResult> {
    try {
      // Validate input size to prevent resource exhaustion
      const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB
      if (content.length > MAX_CONTENT_SIZE) {
        return {
          success: false,
          testCases: [],
          error: `Content too large. Maximum size is ${MAX_CONTENT_SIZE} bytes.`,
        };
      }

      const report: JestReport = JSON.parse(content);
      const testResults = Array.isArray(report) ? report : [report];

      const testCases: ParsedTestCase[] = [];
      let totalTests = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let totalDuration = 0;

      for (const testResult of testResults) {
        const startTime = testResult.startTime
          ? new Date(testResult.startTime).toISOString()
          : new Date().toISOString();

        // Process assertion results (Jest format)
        if (testResult.assertionResults && testResult.assertionResults.length > 0) {
          for (const assertion of testResult.assertionResults) {
            totalTests++;
            const status = this.mapJestStatus(assertion.status);
            if (status === 'pass') passed++;
            else if (status === 'fail') failed++;
            else if (status === 'skip') skipped++;

            const duration = assertion.duration || 0;
            totalDuration += duration;

            // Extract file path from fullName or use test suite name
            const path = this.extractPath(assertion.fullName, testResult.name);

            testCases.push({
              path,
              name: assertion.title || assertion.fullName,
              status,
              durationMs: duration > 0 ? Math.round(duration) : undefined,
              startedAt: startTime,
              failureDetails: assertion.failureMessages?.join('\n\n') || undefined,
              tags: assertion.ancestorTitles,
            });
          }
        } else {
          // Fallback: treat the test result itself as a test case
          totalTests++;
          const status = this.mapJestStatus(testResult.status);
          if (status === 'pass') passed++;
          else if (status === 'fail') failed++;
          else if (status === 'skip') skipped++;

          const duration =
            testResult.endTime && testResult.startTime
              ? testResult.endTime - testResult.startTime
              : 0;
          totalDuration += duration;

          testCases.push({
            path: this.extractPath(testResult.name, testResult.name),
            name: testResult.name,
            status,
            durationMs: duration > 0 ? Math.round(duration) : undefined,
            startedAt: startTime,
          });
        }
      }

      return {
        success: true,
        testCases,
        metadata: {
          totalTests,
          passed,
          failed,
          skipped,
          duration: totalDuration > 0 ? Math.round(totalDuration) : undefined,
        },
      };
    } catch (error) {
      logger.error('Failed to parse Jest report', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to parse Jest report',
      };
    }
  }

  /**
   * Map Jest status to standardized status
   */
  private mapJestStatus(status: string): 'pass' | 'fail' | 'skip' {
    switch (status) {
      case 'passed':
        return 'pass';
      case 'failed':
        return 'fail';
      case 'pending':
      case 'skipped':
      case 'todo':
        return 'skip';
      default:
        return 'skip';
    }
  }

  /**
   * Extract file path from test name
   * Sanitizes path to prevent path traversal attacks
   */
  private extractPath(fullName: string, fallback: string): string {
    // Try to extract file path from fullName (e.g., "src/utils.test.ts > Utils > should work")
    const parts = fullName.split(' > ');
    if (parts.length > 0) {
      let firstPart = parts[0];
      // Check if it looks like a file path
      if (
        firstPart.includes('/') ||
        firstPart.includes('\\') ||
        firstPart.endsWith('.ts') ||
        firstPart.endsWith('.js')
      ) {
        // Sanitize path: remove path traversal sequences and limit length
        firstPart = firstPart.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
        if (firstPart.length > 500) {
          firstPart = firstPart.substring(0, 500);
        }
        return firstPart || fallback;
      }
    }
    // Sanitize fallback as well
    const sanitizedFallback = fallback.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
    return sanitizedFallback.length > 500 ? sanitizedFallback.substring(0, 500) : sanitizedFallback;
  }
}
