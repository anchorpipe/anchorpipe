import type { NextRequest, NextResponse } from 'next/server';
import { buildNextRequest } from '@/test-utils/build-next-request';
import type { IngestionPayload } from '@/lib/server/ingestion-schema';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface JsonRequestOptions {
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: unknown;
}

/**
 * Build a JSON NextRequest targeting the local test server.
 */
export function buildJsonRequest(path: string, options: JsonRequestOptions = {}): NextRequest {
  const { method = 'POST', headers, body } = options;
  const mergedHeaders = new Headers(headers);
  if (body !== undefined && !mergedHeaders.has('content-type')) {
    mergedHeaders.set('content-type', 'application/json');
  }

  const requestInit: RequestInit = {
    method,
    headers: mergedHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  return buildNextRequest(`http://localhost${path}`, requestInit);
}

/**
 * Parse a NextResponse JSON payload in a type-safe manner.
 */
export async function readJson<T>(response: NextResponse): Promise<T> {
  return (await response.json()) as T;
}

export interface IngestionPayloadOverrides {
  repo_id?: string;
  commit_sha?: string;
  run_id?: string;
  /* cspell:disable-next-line */
  framework?: 'jest' | 'pytest' | 'playwright';
  tests?: Array<{
    path: string;
    name: string;
    status: 'pass' | 'fail' | 'skip';
    durationMs?: number;
    startedAt?: string;
  }>;
}

/**
 * Create a minimal ingestion payload suitable for API integration tests.
 */
export function createIngestionPayload(
  overrides: IngestionPayloadOverrides = {}
): IngestionPayload {
  const defaultTests: IngestionPayload['tests'] = [
    {
      path: 'packages/app/example.test.ts',
      name: 'should work',
      status: 'pass',
      durationMs: 100,
      startedAt: new Date().toISOString(),
    },
  ];

  return {
    repo_id: overrides.repo_id ?? '00000000-0000-0000-0000-000000000000',
    commit_sha: overrides.commit_sha ?? 'a'.repeat(40),
    run_id: overrides.run_id ?? 'run-1',
    framework: overrides.framework ?? 'jest',
    tests: (overrides.tests ?? defaultTests).map((test) => ({
      ...test,
      startedAt: test.startedAt ?? new Date().toISOString(),
    })),
  };
}
