#!/usr/bin/env node

/**
 * Test Report Parser Script
 *
 * Tests a parser with a sample test report file.
 *
 * Usage:
 *   node scripts/test-parser.js <framework> <file-path>
 *
 * Examples:
 *   node scripts/test-parser.js jest test-data/reports/jest-report.json
 *   node scripts/test-parser.js pytest test-data/reports/pytest-report.json
 *   node scripts/test-parser.js junit test-data/reports/junit-report.xml
 *   node scripts/test-parser.js playwright test-data/reports/playwright-report.json
 */

const fs = require('fs');
const path = require('path');

// Register TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    skipLibCheck: true,
  },
});

// Import parser
const { parseTestReport } = require('../apps/web/src/lib/server/test-report-parsers/index.ts');

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node scripts/test-parser.js <framework> <file-path>');
    console.error('');
    console.error('Frameworks: jest, pytest, junit, playwright');
    process.exit(1);
  }

  const [framework, filePath] = args;

  // Validate framework
  const supportedFrameworks = ['jest', 'pytest', 'junit', 'playwright'];
  if (!supportedFrameworks.includes(framework.toLowerCase())) {
    console.error(`Error: Unsupported framework "${framework}"`);
    console.error(`Supported frameworks: ${supportedFrameworks.join(', ')}`);
    process.exit(1);
  }

  // Read file
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  console.log(`Testing ${framework} parser with: ${filePath}`);
  console.log('─'.repeat(60));

  try {
    const result = await parseTestReport(framework, content);

    if (result.success) {
      console.log('✅ Parsing successful!');
      console.log('');
      console.log(`Test Cases: ${result.testCases.length}`);
      if (result.metadata) {
        console.log(`  Total: ${result.metadata.totalTests || 0}`);
        console.log(`  Passed: ${result.metadata.passed || 0}`);
        console.log(`  Failed: ${result.metadata.failed || 0}`);
        console.log(`  Skipped: ${result.metadata.skipped || 0}`);
        if (result.metadata.duration) {
          console.log(`  Duration: ${result.metadata.duration}ms`);
        }
      }
      console.log('');

      // Show first few test cases
      if (result.testCases.length > 0) {
        console.log('Sample test cases:');
        result.testCases.slice(0, 5).forEach((testCase, index) => {
          console.log(`  ${index + 1}. ${testCase.name}`);
          console.log(`     Path: ${testCase.path}`);
          console.log(`     Status: ${testCase.status}`);
          if (testCase.durationMs) {
            console.log(`     Duration: ${testCase.durationMs}ms`);
          }
          if (testCase.failureDetails) {
            console.log(`     Failure: ${testCase.failureDetails.substring(0, 50)}...`);
          }
        });
        if (result.testCases.length > 5) {
          console.log(`  ... and ${result.testCases.length - 5} more`);
        }
      }
    } else {
      console.error('❌ Parsing failed!');
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
