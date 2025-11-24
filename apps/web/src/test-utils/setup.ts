import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

afterEach(() => {
  cleanup();
});

function ensureEnv(key: string, fallback: string) {
  if (!process.env[key]) {
    process.env[key] = fallback;
  }
}

beforeAll(() => {
  ensureEnv('NODE_ENV', 'test');
  ensureEnv('AUTH_SECRET', 'test-secret-key');
  ensureEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/anchorpipe_test');
  ensureEnv('REDIS_URL', 'redis://localhost:6379');
});
