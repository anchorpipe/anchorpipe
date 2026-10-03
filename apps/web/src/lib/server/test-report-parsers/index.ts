/**
 * Test Report Parsers
 *
 * Registry and utilities for test report parsers.
 *
 * Story: ST-304
 */

import { TestReportParser, ParseResult } from './types';
import { JestParser } from './jest-parser';
import { PyTestParser } from './pytest-parser';
import { PlaywrightParser } from './playwright-parser';
import { JUnitParser } from './junit-parser';
import { logger } from '../logger';

/**
 * Parser registry
 */
const parsers = new Map<string, TestReportParser>([
  ['jest', new JestParser()],
  ['pytest', new PyTestParser()],
  ['playwright', new PlaywrightParser()],
  ['junit', new JUnitParser()],
]);

/**
 * Get parser for a framework
 */
export function getParser(framework: string): TestReportParser | null {
  return parsers.get(framework.toLowerCase()) || null;
}

/**
 * Parse test report with appropriate parser
 */
export async function parseTestReport(framework: string, content: string): Promise<ParseResult> {
  const parser = getParser(framework);
  if (!parser) {
    logger.warn('No parser found for framework', { framework });
    return {
      success: false,
      testCases: [],
      error: `No parser available for framework: ${framework}`,
    };
  }

  try {
    return await parser.parse(content);
  } catch (error) {
    logger.error('Failed to parse test report', {
      framework,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      testCases: [],
      error: error instanceof Error ? error.message : 'Failed to parse test report',
    };
  }
}

/**
 * List supported frameworks
 */
export function getSupportedFrameworks(): string[] {
  return Array.from(parsers.keys());
}

/**
 * Export parser types
 */
export type { TestReportParser, ParseResult, ParsedTestCase } from './types';
