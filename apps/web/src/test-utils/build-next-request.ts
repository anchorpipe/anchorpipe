import { NextRequest } from 'next/server';

/**
 * Helper for constructing NextRequest instances within Vitest suites.
 */
export function buildNextRequest(url: string, init?: RequestInit): NextRequest {
  const normalizedInit = init
    ? {
        ...init,
        signal: init.signal ?? undefined,
      }
    : undefined;

  return new NextRequest(url, normalizedInit as ConstructorParameters<typeof NextRequest>[1]);
}
