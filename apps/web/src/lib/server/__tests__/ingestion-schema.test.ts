import { describe, it, expect } from 'vitest';
import {
  IngestionPayloadSchema,
  TestCaseSchema,
  TestRunStatusSchema,
} from '../ingestion-schema';

describe('ingestion-schema', () => {
  describe('TestRunStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(TestRunStatusSchema.parse('pass')).toBe('pass');
      expect(TestRunStatusSchema.parse('fail')).toBe('fail');
      expect(TestRunStatusSchema.parse('skip')).toBe('skip');
    });

    it('rejects invalid status values', () => {
      expect(() => TestRunStatusSchema.parse('invalid')).toThrow();
    });
  });

  describe('TestCaseSchema', () => {
    const validTestCase = {
      path: 'src/test.ts',
      name: 'test case',
      status: 'pass' as const,
      startedAt: '2024-01-01T00:00:00.000Z',
    };

    it('validates minimal test case', () => {
      const result = TestCaseSchema.parse(validTestCase);
      expect(result.path).toBe('src/test.ts');
      expect(result.name).toBe('test case');
      expect(result.status).toBe('pass');
    });

    it('validates test case with all fields', () => {
      const fullCase = {
        ...validTestCase,
        durationMs: 100,
        failureDetails: 'Error message',
        tags: ['unit', 'fast'],
        metadata: { key: 'value' },
      };
      const result = TestCaseSchema.parse(fullCase);
      expect(result.durationMs).toBe(100);
      expect(result.failureDetails).toBe('Error message');
      expect(result.tags).toEqual(['unit', 'fast']);
    });

    it('rejects invalid path', () => {
      expect(() => TestCaseSchema.parse({ ...validTestCase, path: '' })).toThrow();
      expect(() =>
        TestCaseSchema.parse({ ...validTestCase, path: 'a'.repeat(501) })
      ).toThrow();
    });

    it('rejects invalid startedAt format', () => {
      expect(() => TestCaseSchema.parse({ ...validTestCase, startedAt: 'invalid' })).toThrow();
      expect(() => TestCaseSchema.parse({ ...validTestCase, startedAt: '2024-01-01' })).toThrow();
    });

    it('rejects failureDetails that are too long', () => {
      expect(() =>
        TestCaseSchema.parse({
          ...validTestCase,
          failureDetails: 'a'.repeat(10001),
        })
      ).toThrow();
    });
  });

  describe('IngestionPayloadSchema', () => {
    const validPayload = {
      repo_id: '123e4567-e89b-12d3-a456-426614174000',
      commit_sha: 'a'.repeat(40),
      run_id: 'run-123',
      framework: 'jest' as const,
      tests: [
        {
          path: 'test.ts',
          name: 'test',
          status: 'pass' as const,
          startedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    };

    it('validates minimal payload', () => {
      const result = IngestionPayloadSchema.parse(validPayload);
      expect(result.repo_id).toBe(validPayload.repo_id);
      expect(result.commit_sha).toBe(validPayload.commit_sha);
    });

    it('validates payload with optional fields', () => {
      const fullPayload = {
        ...validPayload,
        branch: 'main',
        pull_request: '123',
        environment: { CI: 'true' },
        metadata: { key: 'value' },
        idempotency_key: 'key-123',
      };
      const result = IngestionPayloadSchema.parse(fullPayload);
      expect(result.branch).toBe('main');
      expect(result.pull_request).toBe('123');
    });

    it('rejects invalid UUID for repo_id', () => {
      expect(() => IngestionPayloadSchema.parse({ ...validPayload, repo_id: 'invalid' })).toThrow();
    });

    it('rejects invalid commit_sha length', () => {
      expect(() =>
        IngestionPayloadSchema.parse({ ...validPayload, commit_sha: 'short' })
      ).toThrow();
    });

    it('rejects invalid commit_sha format', () => {
      expect(() =>
        IngestionPayloadSchema.parse({ ...validPayload, commit_sha: 'g'.repeat(40) })
      ).toThrow();
    });

    it('rejects empty tests array', () => {
      expect(() => IngestionPayloadSchema.parse({ ...validPayload, tests: [] })).toThrow();
    });

    it('rejects too many tests', () => {
      const manyTests = Array(10001).fill({
        path: 'test.ts',
        name: 'test',
        status: 'pass' as const,
        startedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(() => IngestionPayloadSchema.parse({ ...validPayload, tests: manyTests })).toThrow();
    });

    it('accepts valid framework values', () => {
      const frameworks = ['junit', 'jest', 'pytest', 'playwright', 'mocha', 'vitest', 'unknown'];
      for (const framework of frameworks) {
        const result = IngestionPayloadSchema.parse({
          ...validPayload,
          framework: framework as any,
        });
        expect(result.framework).toBe(framework);
      }
    });
  });
});

