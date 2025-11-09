/**
 * PyTest Test Report Parser
 *
 * Parses PyTest JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';
import { validateContentSize, sanitizePath, sanitizeString, updateTestStats } from './utils';

/**
 * PyTest test result format
 */
interface PyTestReport {
  report?: {
    tests?: Array<{
      nodeid: string;
      outcome: 'passed' | 'failed' | 'skipped';
      duration: number;
      setup?: { outcome: string; duration: number };
      call?: { outcome: string; duration: number; longrepr?: string };
      teardown?: { outcome: string; duration: number };
    }>;
  };
  // Alternative format: direct array
  tests?: Array<{
    nodeid: string;
    outcome: 'passed' | 'failed' | 'skipped';
    duration: number;
    setup?: { outcome: string; duration: number };
    call?: { outcome: string; duration: number; longrepr?: string };
    teardown?: { outcome: string; duration: number };
  }>;
}

/**
 * PyTest test report parser
 */
export class PyTestParser implements TestReportParser {
  framework = 'pytest';

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

      const report: PyTestReport = JSON.parse(content);
      const tests = report.report?.tests || report.tests || [];

      const testCases = this.processTests(tests);
      const metadata = this.calculateMetadata(testCases);

      return {
        success: true,
        testCases,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to parse PyTest report', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to parse PyTest report',
      };
    }
  }

  /**
   * Process PyTest tests into test cases
   */
  private processTests(
    tests: Array<{
      nodeid: string;
      outcome: 'passed' | 'failed' | 'skipped';
      duration: number;
      setup?: { outcome: string; duration: number };
      call?: { outcome: string; duration: number; longrepr?: string };
      teardown?: { outcome: string; duration: number };
    }>
  ): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];
    const startTime = new Date().toISOString();

    for (const test of tests) {
      const status = this.mapPyTestOutcome(test.outcome);
      const duration = this.calculateTestDuration(test);
      const { path, name } = this.parseNodeId(test.nodeid);

      testCases.push({
        path,
        name,
        status,
        durationMs: duration > 0 ? Math.round(duration * 1000) : undefined,
        startedAt: startTime,
        failureDetails: test.call?.longrepr || undefined,
      });
    }

    return testCases;
  }

  /**
   * Calculate test duration from setup, call, and teardown
   */
  private calculateTestDuration(test: {
    setup?: { duration: number };
    call?: { duration: number };
    duration: number;
    teardown?: { duration: number };
  }): number {
    return (
      (test.setup?.duration || 0) +
      (test.call?.duration || test.duration || 0) +
      (test.teardown?.duration || 0)
    );
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
   * Map PyTest outcome to standardized status
   */
  private mapPyTestOutcome(outcome: string): 'pass' | 'fail' | 'skip' {
    switch (outcome) {
      case 'passed':
        return 'pass';
      case 'failed':
        return 'fail';
      case 'skipped':
        return 'skip';
      default:
        return 'skip';
    }
  }

  /**
   * Parse PyTest nodeid into path and name
   * Sanitizes path to prevent path traversal attacks
   */
  private parseNodeId(nodeid: string): { path: string; name: string } {
    // Format: "path/to/test_file.py::TestClass::test_method" or "path/to/test_file.py::test_function"
    const parts = nodeid.split('::');
    if (parts.length === 0) {
      const safePath = sanitizePath(nodeid);
      return { path: safePath, name: safePath };
    }

    const path = sanitizePath(parts[0]);
    const name = sanitizeString(parts.slice(1).join('::') || path);

    return { path, name };
  }
}
