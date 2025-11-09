/**
 * PyTest Test Report Parser
 *
 * Parses PyTest JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';

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
      const report: PyTestReport = JSON.parse(content);
      const tests = report.report?.tests || report.tests || [];

      const testCases: ParsedTestCase[] = [];
      let totalTests = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let totalDuration = 0;
      const startTime = new Date().toISOString();

      for (const test of tests) {
        totalTests++;
        const status = this.mapPyTestOutcome(test.outcome);
        if (status === 'pass') passed++;
        else if (status === 'fail') failed++;
        else if (status === 'skip') skipped++;

        // Calculate total duration (setup + call + teardown)
        const duration =
          (test.setup?.duration || 0) +
          (test.call?.duration || test.duration || 0) +
          (test.teardown?.duration || 0);
        totalDuration += duration;

        // Extract file path and test name from nodeid
        // Format: "path/to/test_file.py::TestClass::test_method" or "path/to/test_file.py::test_function"
        const { path, name } = this.parseNodeId(test.nodeid);

        testCases.push({
          path,
          name,
          status,
          durationMs: duration > 0 ? Math.round(duration * 1000) : undefined, // Convert seconds to ms
          startedAt: startTime,
          failureDetails: test.call?.longrepr || undefined,
        });
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
   */
  private parseNodeId(nodeid: string): { path: string; name: string } {
    // Format: "path/to/test_file.py::TestClass::test_method" or "path/to/test_file.py::test_function"
    const parts = nodeid.split('::');
    if (parts.length === 0) {
      return { path: nodeid, name: nodeid };
    }

    const path = parts[0];
    const name = parts.slice(1).join('::') || path;

    return { path, name };
  }
}
