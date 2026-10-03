import { describe, expect, it } from 'vitest';
import { normalizeTestCases, normalizeTestCase, type CanonicalTestStatus } from './normalizer';

describe('normalizeTestCases', () => {
  it('normalizes parser-shaped cases from all supported frameworks', () => {
    const cases = [
      { path: 'junit/Test', name: 'junit pass', status: 'pass' },
      { path: 'src/jest.test.ts', name: 'jest fail', status: 'fail', failureDetails: 'assertion' },
      { path: 'tests/test.py', name: 'pytest skip', status: 'skip' },
      { path: 'tests/example.spec.ts', name: 'playwright error', status: 'error' },
      { path: 'test/mocha.js', name: 'mocha pass', state: 'passed' },
      { path: 'test/vitest.test.ts', name: 'vitest fail', outcome: 'failed' },
    ];

    const statuses: CanonicalTestStatus[] = ['pass', 'fail', 'skip', 'error', 'pass', 'fail'];
    const frameworks = ['junit', 'jest', 'pytest', 'playwright', 'mocha', 'vitest'];

    frameworks.forEach((framework, index) => {
      const result = normalizeTestCases(framework, [cases[index]]);
      expect(result.warnings).toEqual([]);
      expect(result.testCases[0].status).toBe(statuses[index]);
      expect(result.testCases[0].provenance.framework).toBe(framework);
      expect(result.testCases[0].provenance.sourceIndex).toBe(0);
      expect(result.testCases[0].raw).toBe(cases[index]);
    });
  });

  it('maps common framework status spellings without conflating errors and failures', () => {
    const result = normalizeTestCases('playwright', [
      { path: 'spec.ts', name: 'passed', status: 'passed' },
      { path: 'spec.ts', name: 'failed', status: 'failed' },
      { path: 'spec.ts', name: 'skipped', status: 'skipped' },
      { path: 'spec.ts', name: 'timeout', status: 'timedOut' },
      { path: 'spec.ts', name: 'error', status: 'errored' },
      { path: 'spec.ts', name: 'unrecognized', status: 'flaky-ish' },
    ]);

    expect(result.testCases.map((testCase) => testCase.status)).toEqual([
      'pass',
      'fail',
      'skip',
      'error',
      'error',
      'unknown',
    ]);
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'UNKNOWN_STATUS', sourceIndex: 5, field: 'status' }),
    ]);
  });

  it('produces deterministic canonical facts and ISO timestamps', () => {
    const input = {
      file: 'tests/a.test.ts',
      fullTitle: 'suite > works',
      status: 'passed',
      duration: 12.6,
      startTime: '2026-01-02T03:04:05+02:00',
      tags: ['smoke'],
      metadata: { shard: 1 },
    };

    const first = normalizeTestCases('mocha', [input]);
    const second = normalizeTestCases('mocha', [input]);

    expect(first).toEqual(second);
    expect(first.testCases[0]).toMatchObject({
      path: 'tests/a.test.ts',
      name: 'suite > works',
      status: 'pass',
      durationMs: 13,
      startedAt: '2026-01-02T01:04:05.000Z',
      tags: ['smoke'],
      metadata: { shard: 1 },
    });
  });

  it('retains malformed records and emits warnings instead of dropping them', () => {
    const malformed = null;
    const result = normalizeTestCases('jest', [
      malformed,
      { path: '', name: '', status: 'not-a-status', durationMs: -1, startedAt: 'not a date' },
    ]);

    expect(result.testCases).toHaveLength(2);
    expect(result.testCases[0]).toMatchObject({
      path: 'unknown',
      name: 'unknown',
      status: 'unknown',
      raw: malformed,
    });
    expect(result.testCases[1]).toMatchObject({
      path: 'unknown',
      name: 'unknown',
      status: 'unknown',
    });
    expect(result.warnings.map((item) => item.code)).toEqual([
      'MALFORMED_RECORD',
      'MISSING_FIELD',
      'MISSING_FIELD',
      'UNKNOWN_STATUS',
      'INVALID_FIELD',
      'INVALID_FIELD',
    ]);
  });

  it('preserves error and failure source details and arbitrary raw fields', () => {
    const raw = {
      file: 'spec.ts',
      title: 'throws',
      status: 'error',
      error: { message: 'boom', stack: 'at test' },
      providerSpecific: { retry: 2 },
    };
    const result = normalizeTestCase('vitest', raw, 7);

    expect(result.warnings).toEqual([]);
    expect(result.testCase).toMatchObject({
      path: 'spec.ts',
      name: 'throws',
      status: 'error',
      failureDetails: 'boom\n\nat test',
      raw,
      provenance: { sourceFramework: 'vitest', framework: 'vitest', sourceIndex: 7, raw },
    });
  });

  it('warns once for an unsupported framework while retaining cases', () => {
    const raw = { path: 'x', name: 'test', status: 'passed' };
    const result = normalizeTestCases('custom-runner', [raw]);

    expect(result.testCases[0].status).toBe('pass');
    expect(result.testCases[0].provenance).toMatchObject({
      sourceFramework: 'custom-runner',
      framework: 'unknown',
    });
    expect(result.warnings).toEqual([
      {
        code: 'UNSUPPORTED_FRAMEWORK',
        message:
          'Framework "custom-runner" is unsupported; cases use unknown framework provenance.',
      },
    ]);
  });
});
