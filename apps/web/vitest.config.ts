import path from 'path';
import { defineConfig, defineProject } from 'vitest/config';

const COVERAGE_TARGET = 80; // Decision 1: apps should trend toward ≥80% line coverage (libs to 90%) once suites mature.
const STRICT_COVERAGE = process.env.COVERAGE_STRICT === 'true';
const repoRoot = path.resolve(__dirname, '..', '..');
const ALIASES = {
  '@': path.resolve(__dirname, './src'),
  '@anchorpipe/database': path.resolve(repoRoot, 'libs/database/src'),
  '@anchorpipe/mq': path.resolve(repoRoot, 'libs/mq/src'),
  '@anchorpipe/storage': path.resolve(repoRoot, 'libs/storage/src'),
};
const DOM_TEST_GLOBS = [
  '**/*.dom.test.ts',
  '**/*.dom.test.tsx',
  '**/*.dom.spec.ts',
  '**/*.dom.spec.tsx',
  '**/*.component.test.ts',
  '**/*.component.test.tsx',
];

const coverageConfig = {
  provider: 'v8' as const,
  reporter: ['text', 'json', 'html', 'lcov'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'node_modules/',
    'src/test-utils/',
    '.next/**',
    '**/*.config.ts',
    '**/*.d.ts',
    '**/types.ts',
  ],
  thresholds: STRICT_COVERAGE
    ? {
        lines: COVERAGE_TARGET,
        functions: COVERAGE_TARGET,
        branches: COVERAGE_TARGET,
        statements: COVERAGE_TARGET,
      }
    : undefined,
};

const sharedTestOptions = {
  globals: true,
  setupFiles: ['./src/test-utils/setup.ts'],
};

export default defineConfig({
  test: {
    coverage: coverageConfig,
    projects: [
      defineProject({
        resolve: { alias: ALIASES },
        test: {
          ...sharedTestOptions,
          name: 'node',
          environment: 'node',
          exclude: DOM_TEST_GLOBS,
        },
      }),
      defineProject({
        resolve: { alias: ALIASES },
        test: {
          ...sharedTestOptions,
          name: 'dom',
          environment: 'jsdom',
          include: DOM_TEST_GLOBS,
        },
      }),
    ],
  },
  resolve: {
    alias: ALIASES,
  },
});
