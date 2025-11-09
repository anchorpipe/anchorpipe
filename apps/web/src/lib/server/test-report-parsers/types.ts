/**
 * Test Report Parser Types
 *
 * Types and interfaces for test report parsers.
 *
 * Story: ST-304
 */

import { TestCase } from '../ingestion-schema';

/**
 * Standardized test case output format
 */
export type ParsedTestCase = TestCase;

/**
 * Parser result
 */
export interface ParseResult {
  success: boolean;
  testCases: ParsedTestCase[];
  error?: string;
  metadata?: {
    totalTests?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    duration?: number;
  };
}

/**
 * Test report parser interface
 */
export interface TestReportParser {
  /**
   * Framework name this parser handles
   */
  framework: string;

  /**
   * Parse test report content
   * @param content Raw test report content (XML, JSON, etc.)
   * @returns Parsed test cases in standardized format
   */
  parse(content: string): Promise<ParseResult>;
}
