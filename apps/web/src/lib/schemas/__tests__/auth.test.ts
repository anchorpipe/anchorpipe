import { describe, it, expect } from 'vitest';
import { emailSchema, passwordSchema, registerSchema, loginSchema } from '../auth';

describe('auth schemas', () => {
  it('normalizes email addresses', () => {
    const result = emailSchema.parse('USER@Example.COM');
    expect(result).toBe('user@example.com');
  });

  it('rejects passwords without complexity', () => {
    expect(() => passwordSchema.parse('password')).toThrow(/uppercase/);
  });

  it('validates register payloads', () => {
    const data = registerSchema.parse({ email: 'test@example.com', password: 'Rocket1!' });
    expect(data).toEqual({ email: 'test@example.com', password: 'Rocket1!' });
  });

  it('validates login payloads and trims email', () => {
    const data = loginSchema.parse({ email: 'TEST@EXAMPLE.com', password: 'pw' });
    expect(data.email).toBe('test@example.com');
  });
});
