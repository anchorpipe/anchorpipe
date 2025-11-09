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
      // Validate input size to prevent resource exhaustion
      const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB
      if (content.length > MAX_CONTENT_SIZE) {
        return {
          success: false,
          testCases: [],
          error: `Content too large. Maximum size is ${MAX_CONTENT_SIZE} bytes.`,
        };
      }

      const parsed = this.parser.parse(content) as JUnitTestSuite;
      const testCases: ParsedTestCase[] = [];
      let totalTests = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let totalDuration = 0;

      // Handle testsuites wrapper
      const suites = parsed.testsuites?.testsuite
        ? Array.isArray(parsed.testsuites.testsuite)
          ? parsed.testsuites.testsuite
          : [parsed.testsuites.testsuite]
        : parsed.testsuite
          ? [parsed.testsuite]
          : [];

      for (const suite of suites) {
        if (!suite) continue;

        const suiteTimestamp = suite['@_timestamp']
          ? new Date(suite['@_timestamp']).toISOString()
          : new Date().toISOString();
        const suiteTime = parseFloat(suite['@_time'] || '0');

        const testCasesInSuite = Array.isArray(suite.testcase)
          ? suite.testcase
          : suite.testcase
            ? [suite.testcase]
            : [];

        for (const testCase of testCasesInSuite) {
          totalTests++;
          const status = this.determineStatus(testCase);
          if (status === 'pass') passed++;
          else if (status === 'fail') failed++;
          else if (status === 'skip') skipped++;

          const duration = parseFloat(testCase['@_time'] || '0');
          totalDuration += duration;

          // Extract path and name
          const className = testCase['@_classname'] || suite['@_name'] || 'unknown';
          const testName = testCase['@_name'] || 'unknown';
          const path = this.extractPath(className);

          // Extract failure/error details
          const failureDetails = this.extractFailureDetails(testCase);

          testCases.push({
            path,
            name: testName,
            status,
            durationMs: duration > 0 ? Math.round(duration * 1000) : undefined, // Convert seconds to ms
            startedAt: suiteTimestamp,
            failureDetails,
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
          duration: totalDuration > 0 ? Math.round(totalDuration * 1000) : undefined,
        },
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

    // Sanitize path: remove path traversal sequences and limit length
    path = path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
    if (path.length > 500) {
      path = path.substring(0, 500);
    }

    return path || 'unknown';
  }
}
