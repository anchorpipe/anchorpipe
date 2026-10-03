/**
 * JUnit Test Report Parser
 *
 * Parses JUnit XML test report format.
 *
 * Story: ST-304
 */

import { XMLParser } from 'fast-xml-parser';
import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';
import { validateContentSize, sanitizePath, sanitizeString, updateTestStats } from './utils';

/**
 * JUnit XML structure
 */
interface JUnitTestSuite {
  testsuite?: {
    '@_name'?: string;
    '@_tests'?: string;
    '@_failures'?: string;
    '@_errors'?: string;
    '@_skipped'?: string;
    '@_time'?: string;
    '@_timestamp'?: string;
    testcase?:
      | Array<{
          '@_name': string;
          '@_classname'?: string;
          '@_time'?: string;
          '@_status'?: string;
          failure?: string | { '@_message'?: string; '#text'?: string };
          error?: string | { '@_message'?: string; '#text'?: string };
          skipped?: string | { '@_message'?: string };
        }>
      | {
          '@_name': string;
          '@_classname'?: string;
          '@_time'?: string;
          '@_status'?: string;
          failure?: string | { '@_message'?: string; '#text'?: string };
          error?: string | { '@_message'?: string; '#text'?: string };
          skipped?: string | { '@_message'?: string };
        };
  };
  testsuites?: {
    testsuite?: Array<JUnitTestSuite['testsuite']> | JUnitTestSuite['testsuite'];
  };
}

/**
 * JUnit test report parser
 */
export class JUnitParser implements TestReportParser {
  framework = 'junit';
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
    });
  }

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

      const parsed = this.parser.parse(content) as JUnitTestSuite;
      const suites = this.extractTestSuites(parsed);
      const testCases = this.processTestSuites(suites);
      const metadata = this.calculateMetadata(testCases);

      return {
        success: true,
        testCases,
        metadata,
      };
    } catch (error) {
      logger.error('Failed to parse JUnit XML report', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        testCases: [],
        error: error instanceof Error ? error.message : 'Failed to parse JUnit XML report',
      };
    }
  }

  /**
   * Extract test suites from parsed XML
   */
  private extractTestSuites(parsed: JUnitTestSuite): Array<JUnitTestSuite['testsuite']> {
    if (parsed.testsuites?.testsuite) {
      return Array.isArray(parsed.testsuites.testsuite)
        ? parsed.testsuites.testsuite
        : [parsed.testsuites.testsuite];
    }
    if (parsed.testsuite) {
      return [parsed.testsuite];
    }
    return [];
  }

  /**
   * Process test suites into test cases
   */
  private processTestSuites(suites: Array<JUnitTestSuite['testsuite']>): ParsedTestCase[] {
    const testCases: ParsedTestCase[] = [];

    for (const suite of suites) {
      if (!suite) continue;
      const suiteCases = this.processTestSuite(suite);
      testCases.push(...suiteCases);
    }

    return testCases;
  }

  /**
   * Process a single test suite
   */
  private processTestSuite(suite: NonNullable<JUnitTestSuite['testsuite']>): ParsedTestCase[] {
    const suiteTimestamp = suite['@_timestamp']
      ? new Date(suite['@_timestamp']).toISOString()
      : new Date().toISOString();

    const testCasesInSuite = Array.isArray(suite.testcase)
      ? suite.testcase
      : suite.testcase
        ? [suite.testcase]
        : [];

    const testCases: ParsedTestCase[] = [];

    for (const testCase of testCasesInSuite) {
      const status = this.determineStatus(testCase);
      const duration = parseFloat(testCase['@_time'] || '0');
      const className = testCase['@_classname'] || suite['@_name'] || 'unknown';
      const testName = testCase['@_name'] || 'unknown';
      const path = this.extractPath(className);
      const failureDetails = this.extractFailureDetails(testCase);

      testCases.push({
        path,
        name: sanitizeString(testName),
        status,
        durationMs: duration > 0 ? Math.round(duration * 1000) : undefined,
        startedAt: suiteTimestamp,
        failureDetails,
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
   * Determine test status from JUnit test case
   */
  private determineStatus(testCase: {
    failure?: string | { '@_message'?: string; '#text'?: string };
    error?: string | { '@_message'?: string; '#text'?: string };
    skipped?: string | { '@_message'?: string };
    '@_status'?: string;
  }): 'pass' | 'fail' | 'skip' {
    if (testCase.failure || testCase.error) {
      return 'fail';
    }
    if (testCase.skipped) {
      return 'skip';
    }
    if (testCase['@_status'] === 'skipped') {
      return 'skip';
    }
    return 'pass';
  }

  /**
   * Extract failure details from JUnit test case
   */
  private extractFailureDetails(testCase: {
    failure?: string | { '@_message'?: string; '#text'?: string };
    error?: string | { '@_message'?: string; '#text'?: string };
  }): string | undefined {
    if (testCase.failure) {
      if (typeof testCase.failure === 'string') {
        return testCase.failure;
      }
      return [testCase.failure['@_message'], testCase.failure['#text']]
        .filter(Boolean)
        .join('\n\n');
    }
    if (testCase.error) {
      if (typeof testCase.error === 'string') {
        return testCase.error;
      }
      return [testCase.error['@_message'], testCase.error['#text']].filter(Boolean).join('\n\n');
    }
    return undefined;
  }

  /**
   * Extract file path from classname
   * Sanitizes path to prevent path traversal attacks
   */
  private extractPath(className: string): string {
    // JUnit classname format: "package.ClassName" or "path/to/file.ClassName"
    let path: string;
    if (className.includes('/') || className.includes('\\')) {
      path = className;
    } else {
      // Convert package format to path format
      path = className.replace(/\./g, '/');
    }

    return sanitizePath(path);
  }
}
