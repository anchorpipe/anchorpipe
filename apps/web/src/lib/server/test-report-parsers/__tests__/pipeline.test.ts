import { describe, it, expect } from 'vitest';
import { normalizeRawTestReport } from '../pipeline';

describe('normalizeRawTestReport', () => {
  it('parses and normalizes JUnit XML reports', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Suite 1" tests="2" failures="1" time="1.23">
    <testcase name="testPass" classname="com.example.Test" time="0.5"/>
    <testcase name="testFail" classname="com.example.Test" time="0.7">
      <failure message="Assertion failed">Expected true got false</failure>
    </testcase>
  </testsuite>
</testsuites>`;

    const result = await normalizeRawTestReport('junit', xml);

    expect(result.parseSuccess).toBe(true);
    expect(result.testCases.length).toBe(2);
    expect(result.testCases[0].status).toBe('pass');
    expect(result.testCases[0].name).toBe('testPass');
    expect(result.testCases[1].status).toBe('fail');
    expect(result.testCases[1].failureDetails).toContain('Assertion failed');
  });

  it('parses and normalizes Jest JSON reports', async () => {
    const json = JSON.stringify({
      name: 'src/example.test.ts',
      status: 'passed',
      assertionResults: [
        {
          fullName: 'src/example.test.ts > should succeed',
          title: 'should succeed',
          status: 'passed',
          duration: 25,
          ancestorTitles: ['example'],
        },
      ],
    });

    const result = await normalizeRawTestReport('jest', json);

    expect(result.parseSuccess).toBe(true);
    expect(result.testCases.length).toBe(1);
    expect(result.testCases[0].status).toBe('pass');
    expect(result.testCases[0].name).toBe('should succeed');
    expect(result.testCases[0].durationMs).toBe(25);
  });

  it('handles invalid report content gracefully', async () => {
    const result = await normalizeRawTestReport('jest', 'invalid json string');

    expect(result.parseSuccess).toBe(false);
    expect(result.testCases.length).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].code).toBe('MALFORMED_RECORD');
  });
});
