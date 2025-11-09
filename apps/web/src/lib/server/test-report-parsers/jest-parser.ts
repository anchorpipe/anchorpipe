/**
 * Jest Test Report Parser
 *
 * Parses Jest JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';
import { validateContentSize, sanitizePath, sanitizeString, updateTestStats } from './utils';

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
      // Validate input size
      const sizeValidation = validateContentSize(content);
      if (!sizeValidation.valid) {
        return {
          success: false,
          testCases: [],
          error: sizeValidation.error,
        };
      }

      const report: JestReport = JSON.parse(content);
      const testResults = Array.isArray(report) ? report : [report];

      const testCases = this.processTestResults(testResults);
      const metadata = this.calculateMetadata(testCases);

      return {
        success: true,
        testCases,
        metadata,
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
   * Process Jest test results into test cases
   */
  private processTestResults(testResults: JestTestResult[]): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const testResult of testResults) {
      const startTime = this.getStartTime(testResult);
      const cases = this.processAssertionResults(testResult, startTime);
      testCases.push(...cases);
    }

    return testCases;
  }

  /**
   * Get start time from test result
   */
  private getStartTime(testResult: JestTestResult): string {
    return testResult.startTime
      ? new Date(testResult.startTime).toISOString()
      : new Date().toISOString();
  }

  /**
   * Process assertion results or fallback to test result itself
   */
  private processAssertionResults(testResult: JestTestResult, startTime: string): ParsedTestCase[] {
    if (testResult.assertionResults && testResult.assertionResults.length > 0) {
      return this.processAssertions(testResult.assertionResults, testResult.name, startTime);
    }
    return [this.createTestCaseFromResult(testResult, startTime)];
  }

  /**
   * Process assertion results
   */
  private processAssertions(
    assertions: JestAssertionResult[],
    suiteName: string,
    startTime: string
  ): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const assertion of assertions) {
      const status = this.mapJestStatus(assertion.status);
      const duration = assertion.duration || 0;
      const path = this.extractPath(assertion.fullName, suiteName);

      testCases.push({
        path,
        name: sanitizeString(assertion.title || assertion.fullName),
        status,
        durationMs: duration > 0 ? Math.round(duration) : undefined,
        startedAt: startTime,
        failureDetails: assertion.failureMessages?.join('\n\n') || undefined,
        tags: assertion.ancestorTitles,
      });
    }

    return testCases;
  }

  /**
   * Create test case from test result (fallback)
   */
  private createTestCaseFromResult(testResult: JestTestResult, startTime: string): ParsedTestCase {
    const status = this.mapJestStatus(testResult.status);
    const duration =
      testResult.endTime && testResult.startTime ? testResult.endTime - testResult.startTime : 0;

    return {
      path: this.extractPath(testResult.name, testResult.name),
      name: sanitizeString(testResult.name),
      status,
      durationMs: duration > 0 ? Math.round(duration) : undefined,
      startedAt: startTime,
    };
  }

  /**
   * Calculate metadata from test cases
   */
  private calculateMetadata(testCases: ParsedTestCase[]): {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration?: number;
  } {
    const stats = { totalTests: 0, passed: 0, failed: 0, skipped: 0 };
    let totalDuration = 0;

    for (const testCase of testCases) {
      updateTestStats(stats, testCase.status);
      if (testCase.durationMs) {
        totalDuration += testCase.durationMs;
      }
    }

    return {
      ...stats,
      duration: totalDuration > 0 ? totalDuration : undefined,
    };
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
      const firstPart = parts[0];
      // Check if it looks like a file path
      if (this.isFilePath(firstPart)) {
        return sanitizePath(firstPart) || sanitizePath(fallback);
      }
    }
    return sanitizePath(fallback);
  }

  /**
   * Check if string looks like a file path
   */
  private isFilePath(str: string): boolean {
    return str.includes('/') || str.includes('\\') || str.endsWith('.ts') || str.endsWith('.js');
  }
}
