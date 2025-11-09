/**
 * JUnit Parser Tests
 *
 * Unit tests for JUnit XML test report parser.
 *
 * Story: ST-304
 */

import { describe, expect, it } from 'vitest';
import { JUnitParser } from '../junit-parser';

describe('JUnitParser', () => {
  const parser = new JUnitParser();

  it('should parse JUnit XML report', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="TestSuite" tests="2" failures="1" time="1.5" timestamp="2025-01-01T00:00:00">
  <testcase name="testPass" classname="com.example.TestClass" time="1.0"/>
  <testcase name="testFail" classname="com.example.TestClass" time="0.5">
    <failure message="Assertion failed">Expected true, got false</failure>
  </testcase>
</testsuite>`;

    const result = await parser.parse(xml);

    expect(result.success).toBe(true);
    expect(result.testCases).toHaveLength(2);
    expect(result.testCases[0]).toMatchObject({
      path: 'com/example/TestClass',
      name: 'testPass',
      status: 'pass',
      durationMs: 1000,
    });
    expect(result.testCases[1]).toMatchObject({
      path: 'com/example/TestClass',
      name: 'testFail',
      status: 'fail',
      durationMs: 500,
    });
    expect(result.testCases[1].failureDetails).toContain('Assertion failed');
    expect(result.metadata?.totalTests).toBe(2);
    expect(result.metadata?.passed).toBe(1);
    expect(result.metadata?.failed).toBe(1);
  });

  it('should handle skipped tests', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="TestSuite" tests="1" skipped="1" time="0">
  <testcase name="testSkip" classname="com.example.TestClass" time="0">
    <skipped/>
  </testcase>
</testsuite>`;

    const result = await parser.parse(xml);

    expect(result.success).toBe(true);
    expect(result.testCases[0].status).toBe('skip');
    expect(result.metadata?.skipped).toBe(1);
  });

  it('should handle testsuites wrapper', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Suite1" tests="1" time="1.0">
    <testcase name="test1" classname="com.example.Class1" time="1.0"/>
  </testsuite>
  <testsuite name="Suite2" tests="1" time="0.5">
    <testcase name="test2" classname="com.example.Class2" time="0.5"/>
  </testsuite>
</testsuites>`;

    const result = await parser.parse(xml);

    expect(result.success).toBe(true);
    expect(result.testCases).toHaveLength(2);
  });

  it('should handle malformed XML', async () => {
    const result = await parser.parse('invalid xml');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
