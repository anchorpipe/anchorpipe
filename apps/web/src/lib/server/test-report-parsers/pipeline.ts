/**
 * Canonical Normalization Pipeline
 *
 * Integrates raw report parsers (JUnit, Jest, PyTest, Playwright, etc.)
 * directly into canonical normalization results and models.
 */

import { parseTestReport, getSupportedFrameworks } from './index';
import {
  normalizeTestCases,
  type NormalizationResult,
} from '@anchorpipe/ingestion';

export interface ReportNormalizationPipelineResult extends NormalizationResult {
  parseSuccess: boolean;
  parseError?: string;
  metadata?: {
    totalTests?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    duration?: number;
  };
}

/**
 * Parses raw report content with the corresponding framework parser
 * and normalizes the parsed cases into canonical test executions.
 */
export async function normalizeRawTestReport(
  framework: string,
  rawContent: string
): Promise<ReportNormalizationPipelineResult> {
  const parseResult = await parseTestReport(framework, rawContent);

  if (!parseResult.success) {
    return {
      parseSuccess: false,
      parseError: parseResult.error || 'Failed to parse raw test report',
      testCases: [],
      warnings: [
        {
          code: 'MALFORMED_RECORD',
          message: parseResult.error || `Failed to parse raw ${framework} test report.`,
        },
      ],
      metadata: parseResult.metadata,
    };
  }

  const normalization = normalizeTestCases(framework, parseResult.testCases);

  return {
    parseSuccess: true,
    testCases: normalization.testCases,
    warnings: normalization.warnings,
    metadata: parseResult.metadata,
  };
}

export { getSupportedFrameworks };
