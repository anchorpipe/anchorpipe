import path from 'path';
import { defineConfig } from 'vitest/config';

const COVERAGE_TARGET = 80; // Decision 1: apps should trend toward ≥80% line coverage (libs to 90%) once suites mature.
const STRICT_COVERAGE = process.env.COVERAGE_STRICT === 'true';
const repoRoot = path.resolve(__dirname, '..', '..');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-utils/setup.ts'],
    /**
     * Decision 4: keep Vitest parallel but cap at 2 workers to respect shared CI runners.
     */
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2,
      },
    },
    /**
     * Ensure DOM-focused specs (e.g. *.dom.test.tsx) rely on jsdom while server-side tests stay on node.
     */
    environmentMatchGlobs: [
      ['**/*.dom.test.ts', 'jsdom'],
      ['**/*.dom.test.tsx', 'jsdom'],
      ['**/*.dom.spec.ts', 'jsdom'],
      ['**/*.dom.spec.tsx', 'jsdom'],
      ['**/*.component.test.ts', 'jsdom'],
      ['**/*.component.test.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
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
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@anchorpipe/database': path.resolve(repoRoot, 'libs/database/src'),
      '@anchorpipe/mq': path.resolve(repoRoot, 'libs/mq/src'),
      '@anchorpipe/storage': path.resolve(repoRoot, 'libs/storage/src'),
    },
  },
});
