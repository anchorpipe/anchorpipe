/**
 * Playwright Test Report Parser
 *
 * Parses Playwright JSON test report format.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult, ParsedTestCase } from './types';
import { logger } from '../logger';

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
      const report: PlaywrightReport = JSON.parse(content);
      const suites = report.suites || [];

      const testCases: ParsedTestCase[] = [];
      let totalTests = 0;
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let totalDuration = 0;

      for (const suite of suites) {
        for (const spec of suite.specs || []) {
          for (const test of spec.tests || []) {
            for (const result of test.results || []) {
              totalTests++;
              const status = this.mapPlaywrightStatus(result.status);
              if (status === 'pass') passed++;
              else if (status === 'fail') failed++;
              else if (status === 'skip') skipped++;

              const duration = result.duration || 0;
              totalDuration += duration;

              // Build full test name
              const fullName = [suite.title, spec.title, test.title].filter(Boolean).join(' > ');

              testCases.push({
                path: spec.file || suite.file || 'unknown',
                name: fullName || test.title,
                status,
                durationMs: duration > 0 ? Math.round(duration) : undefined,
                startedAt: result.startTime || new Date().toISOString(),
                failureDetails: result.error
                  ? [result.error.message, result.error.stack].filter(Boolean).join('\n\n')
                  : undefined,
              });
            }
          }
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
