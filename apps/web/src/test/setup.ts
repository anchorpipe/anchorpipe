// Test setup file
// This file runs before all tests

// Mock environment variables
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
(process.env as any).NODE_ENV = 'test';
