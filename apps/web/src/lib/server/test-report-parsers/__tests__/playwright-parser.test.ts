/**
 * Playwright Parser Tests
 *
 * Unit tests for Playwright test report parser.
 *
 * Story: ST-304
 */

import { describe, expect, it } from 'vitest';
import { PlaywrightParser } from '../playwright-parser';

describe('PlaywrightParser', () => {
  const parser = new PlaywrightParser();

  it('should parse Playwright JSON report', async () => {
    const report = {
      suites: [
        {
          title: 'Test Suite',
          file: 'tests/example.spec.ts',
          specs: [
            {
              title: 'Test Spec',
              file: 'tests/example.spec.ts',
              tests: [
                {
                  title: 'should pass',
                  results: [
                    {
                      status: 'passed',
                      duration: 1000,
                      startTime: new Date().toISOString(),
                    },
                  ],
                },
                {
                  title: 'should fail',
                  results: [
                    {
                      status: 'failed',
                      duration: 500,
                      startTime: new Date().toISOString(),
                      error: {
                        message: 'Test failed',
                        stack: 'Error: Test failed\n    at ...',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await parser.parse(JSON.stringify(report));

    expect(result.success).toBe(true);
    expect(result.testCases).toHaveLength(2);
    expect(result.testCases[0]).toMatchObject({
      path: 'tests/example.spec.ts',
      name: 'Test Suite > Test Spec > should pass',
      status: 'pass',
      durationMs: 1000,
    });
    expect(result.testCases[1]).toMatchObject({
      path: 'tests/example.spec.ts',
      name: 'Test Suite > Test Spec > should fail',
      status: 'fail',
      durationMs: 500,
    });
    expect(result.testCases[1].failureDetails).toContain('Test failed');
  });

  it('should handle skipped tests', async () => {
    const report = {
      suites: [
        {
          title: 'Test Suite',
          file: 'tests/example.spec.ts',
          specs: [
            {
              title: 'Test Spec',
              file: 'tests/example.spec.ts',
              tests: [
                {
                  title: 'should skip',
                  results: [
                    {
                      status: 'skipped',
                      duration: 0,
                      startTime: new Date().toISOString(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = await parser.parse(JSON.stringify(report));

    expect(result.success).toBe(true);
    expect(result.testCases[0].status).toBe('skip');
    expect(result.metadata?.skipped).toBe(1);
  });

  it('should handle malformed JSON', async () => {
    const result = await parser.parse('invalid json');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
