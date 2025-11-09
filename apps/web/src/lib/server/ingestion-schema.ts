/**
 * Ingestion Payload Schema
 *
 * Zod schemas for validating ingestion endpoint payloads.
 *
 * Story: ST-303 (Critical Gap)
 */

import { z } from 'zod';

/**
 * Test run status enum
 */
export const TestRunStatusSchema = z.enum(['pass', 'fail', 'skip']);

/**
 * Test case schema
 */
export const TestCaseSchema = z.object({
  path: z.string().min(1).max(500), // File path
  name: z.string().min(1).max(500), // Test name
  status: TestRunStatusSchema,
  durationMs: z.number().int().positive().optional(),
  startedAt: z.string().refine(
    (val) => {
      // Validate ISO 8601 datetime format
      const date = new Date(val);
      return !isNaN(date.getTime()) && val.includes('T');
    },
    {
      message: 'startedAt must be a valid ISO 8601 datetime string',
    }
  ), // ISO 8601 datetime
  failureDetails: z.string().max(10000).optional(), // Failure message/details
  tags: z.array(z.string()).optional(), // Test tags
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional metadata
});

/**
 * Ingestion payload schema
 */
export const IngestionPayloadSchema = z.object({
  // Required fields
  repo_id: z.string().uuid(), // Repository UUID
  commit_sha: z
    .string()
    .length(40)
    .refine((val) => /^[0-9a-f]{40}$/i.test(val), {
      message: 'commit_sha must be a valid 40-character hex string',
    }), // 40-char SHA
  run_id: z.string().min(1).max(255), // CI run identifier
  framework: z.enum(['junit', 'jest', 'pytest', 'playwright', 'mocha', 'vitest', 'unknown']),

  // Test data
  tests: z.array(TestCaseSchema).min(1).max(10000), // Test cases (1-10k limit)

  // Optional metadata
  branch: z.string().max(255).optional(), // Git branch
  pull_request: z.string().max(255).optional(), // PR number/ID
  environment: z.record(z.string(), z.string()).optional(), // CI environment variables
  metadata: z.record(z.string(), z.unknown()).optional(), // Additional metadata

  // Idempotency
  idempotency_key: z.string().max(255).optional(), // Optional idempotency key
});

/**
 * Type exports
 */
export type IngestionPayload = z.infer<typeof IngestionPayloadSchema>;
export type TestCase = z.infer<typeof TestCaseSchema>;
export type TestRunStatus = z.infer<typeof TestRunStatusSchema>;
