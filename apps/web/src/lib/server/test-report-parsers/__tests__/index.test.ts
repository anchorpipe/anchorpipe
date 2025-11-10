/**
 * Test Report Parser Registry Tests
 *
 * Unit tests for parser registry and utilities.
 *
 * Story: ST-304
 */

import { describe, expect, it } from 'vitest';
import { getParser, parseTestReport, getSupportedFrameworks } from '../index';

describe('Parser Registry', () => {
  it('should get parser for supported frameworks', () => {
    expect(getParser('jest')).toBeDefined();
    expect(getParser('pytest')).toBeDefined();
    expect(getParser('playwright')).toBeDefined();
    expect(getParser('junit')).toBeDefined();
  });

  it('should return null for unsupported framework', () => {
    expect(getParser('unknown')).toBeNull();
  });

  it('should list supported frameworks', () => {
    const frameworks = getSupportedFrameworks();
    expect(frameworks).toContain('jest');
    expect(frameworks).toContain('pytest');
    expect(frameworks).toContain('playwright');
    expect(frameworks).toContain('junit');
  });

  it('should parse test report with correct parser', async () => {
    const jestReport = {
      name: 'test',
      status: 'passed',
      startTime: Date.now(),
      assertionResults: [
        {
          ancestorTitles: [],
          fullName: 'test',
          status: 'passed',
          title: 'test',
          duration: 10,
        },
      ],
    };

    const result = await parseTestReport('jest', JSON.stringify(jestReport));

    expect(result.success).toBe(true);
    expect(result.testCases.length).toBeGreaterThan(0);
  });

  it('should return error for unsupported framework', async () => {
    const result = await parseTestReport('unknown', '{}');

    expect(result.success).toBe(false);
    expect(result.error).toContain('No parser available');
  });
});
