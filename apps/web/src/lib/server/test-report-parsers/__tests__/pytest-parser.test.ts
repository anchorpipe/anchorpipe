/**
 * PyTest Parser Tests
 *
 * Unit tests for PyTest test report parser.
 *
 * Story: ST-304
 */

import { describe, expect, it } from 'vitest';
import { PyTestParser } from '../pytest-parser';

describe('PyTestParser', () => {
  const parser = new PyTestParser();

  it('should parse PyTest JSON report', async () => {
    const report = {
      report: {
        tests: [
          {
            nodeid: 'tests/test_example.py::test_function',
            outcome: 'passed',
            duration: 0.5,
            call: {
              outcome: 'passed',
              duration: 0.5,
            },
          },
          {
            nodeid: 'tests/test_example.py::TestClass::test_method',
            outcome: 'failed',
            duration: 0.3,
            call: {
              outcome: 'failed',
              duration: 0.3,
              longrepr: 'AssertionError: Expected 1, got 2',
            },
          },
        ],
      },
    };

    const result = await parser.parse(JSON.stringify(report));

    expect(result.success).toBe(true);
    expect(result.testCases).toHaveLength(2);
    expect(result.testCases[0]).toMatchObject({
      path: 'tests/test_example.py',
      name: 'test_function',
      status: 'pass',
      durationMs: 500,
    });
    expect(result.testCases[1]).toMatchObject({
      path: 'tests/test_example.py',
      name: 'TestClass::test_method',
      status: 'fail',
      durationMs: 300,
      failureDetails: 'AssertionError: Expected 1, got 2',
    });
    expect(result.metadata?.totalTests).toBe(2);
    expect(result.metadata?.passed).toBe(1);
    expect(result.metadata?.failed).toBe(1);
  });

  it('should handle skipped tests', async () => {
    const report = {
      report: {
        tests: [
          {
            nodeid: 'tests/test_skip.py::test_skipped',
            outcome: 'skipped',
            duration: 0,
          },
        ],
      },
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
