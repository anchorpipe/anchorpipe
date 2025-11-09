/**
 * Playwright Test Report Parser
 *
 * Parses Playwright JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';
import { validateContentSize, sanitizePath, sanitizeString, updateTestStats } from './utils';

/**
 * Playwright test result format
 */
interface PlaywrightReport {
  config?: {
    projects?: Array<{ name?: string }>;
  };
  suites?: Array<{
    title: string;
    file: string;
    specs: Array<{
      title: string;
      file: string;
      tests: Array<{
        title: string;
        results: Array<{
          status: 'passed' | 'failed' | 'skipped' | 'timedOut';
          duration: number;
          startTime: string;
          error?: {
            message?: string;
            stack?: string;
          };
        }>;
      }>;
    }>;
  }>;
}

/**
 * Playwright test report parser
 */
export class PlaywrightParser implements TestReportParser {
  framework = 'playwright';

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

      const report: PlaywrightReport = JSON.parse(content);
      const suites = report.suites || [];

      const testCases = this.processSuites(suites);
      const metadata = this.calculateMetadata(testCases);

      return {
        success: true,
        testCases,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to parse Playwright report', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to parse Playwright report',
      };
    }
  }

  /**
   * Process Playwright suites into test cases
   */
  private processSuites(
    suites: Array<{
      title: string;
      file: string;
      specs?: Array<{
        title: string;
        file: string;
        tests?: Array<{
          title: string;
          results?: Array<{
            status: 'passed' | 'failed' | 'skipped' | 'timedOut';
            duration: number;
            startTime: string;
            error?: { message?: string; stack?: string };
          }>;
        }>;
      }>;
    }>
  ): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const suite of suites) {
      const suiteCases = this.processSuite(suite);
      testCases.push(...suiteCases);
    }

    return testCases;
  }

  /**
   * Process a single Playwright suite
   */
  private processSuite(suite: {
    title: string;
    file: string;
    specs?: Array<{
      title: string;
      file: string;
      tests?: Array<{
        title: string;
        results?: Array<{
          status: 'passed' | 'failed' | 'skipped' | 'timedOut';
          duration: number;
          startTime: string;
          error?: { message?: string; stack?: string };
        }>;
      }>;
    }>;
  }): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const spec of suite.specs || []) {
      const specCases = this.processSpec(suite, spec);
      testCases.push(...specCases);
    }

    return testCases;
  }

  /**
   * Process a single Playwright spec
   */
  private processSpec(
    suite: { title: string; file: string },
    spec: {
      title: string;
      file: string;
      tests?: Array<{
        title: string;
        results?: Array<{
          status: 'passed' | 'failed' | 'skipped' | 'timedOut';
          duration: number;
          startTime: string;
          error?: { message?: string; stack?: string };
        }>;
      }>;
    }
  ): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const test of spec.tests || []) {
      const testCasesFromTest = this.processTest(suite, spec, test);
      testCases.push(...testCasesFromTest);
    }

    return testCases;
  }

  /**
   * Process a single Playwright test
   */
  private processTest(
    suite: { title: string; file: string },
    spec: { title: string; file: string },
    test: {
      title: string;
      results?: Array<{
        status: 'passed' | 'failed' | 'skipped' | 'timedOut';
        duration: number;
        startTime: string;
        error?: { message?: string; stack?: string };
      }>;
    }
  ): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];
    const fullName = [suite.title, spec.title, test.title].filter(Boolean).join(' > ');

    for (const result of test.results || []) {
      const status = this.mapPlaywrightStatus(result.status);
      const duration = result.duration || 0;
      const path = sanitizePath(spec.file || suite.file || 'unknown');
      const testName = sanitizeString(fullName || test.title);

      testCases.push({
        path,
        name: testName,
        status,
        durationMs: duration > 0 ? Math.round(duration) : undefined,
        startedAt: result.startTime || new Date().toISOString(),
        failureDetails: result.error
          ? [result.error.message, result.error.stack].filter(Boolean).join('\n\n')
          : undefined,
      });
    }

    return testCases;
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
   * Map Playwright status to standardized status
   */
  private mapPlaywrightStatus(status: string): 'pass' | 'fail' | 'skip' {
    switch (status) {
      case 'passed':
        return 'pass';
      case 'failed':
      case 'timedOut':
        return 'fail';
      case 'skipped':
        return 'skip';
      default:
        return 'skip';
    }
  }
}
