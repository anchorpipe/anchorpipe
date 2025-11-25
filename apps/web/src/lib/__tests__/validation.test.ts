import { describe, it, expect, vi } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  validateRequest,
  validateEmail,
  validatePassword,
} from '../validation';
import { z } from 'zod';

describe('validation', () => {
  describe('sanitizeString', () => {
    it('removes angle brackets', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('limits length to 10000 characters', () => {
      const long = 'a'.repeat(15000);
      expect(sanitizeString(long).length).toBe(10000);
    });

    it('handles empty strings', () => {
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes string values', () => {
      const input = { name: '<b>John</b>', age: 30 };
      const result = sanitizeObject(input);
      expect(result.name).toBe('bJohn/b');
      expect(result.age).toBe(30);
    });

    it('sanitizes nested objects recursively', () => {
      const input = {
        user: { name: '<script>evil</script>', email: 'test@example.com' },
        count: 5,
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('scriptevil/script');
      expect(result.user.email).toBe('test@example.com');
      expect(result.count).toBe(5);
    });

    it('handles null values', () => {
      const input = { name: 'John', value: null };
      const result = sanitizeObject(input);
      expect(result.value).toBeNull();
    });
  });

  describe('validateRequest', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    it('validates valid request body', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', age: 25 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await validateRequest(request, schema);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ email: 'test@example.com', age: 25 });
      }
    });

    it('returns error for invalid JSON', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await validateRequest(request, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error).toBe('Invalid JSON in request body');
      }
    });

    it('returns error for invalid schema', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid', age: 15 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await validateRequest(request, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error).toBeTruthy();
      }
    });

    it('includes details in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await validateRequest(request, schema);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toBeDefined();
      }
      vi.unstubAllEnvs();
    });
  });

  describe('validateEmail', () => {
    it('returns null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('returns error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('   ')).toBe('Email is required');
    });

    it('returns error for invalid format', () => {
      expect(validateEmail('not-an-email')).toBe('Invalid email format');
      expect(validateEmail('test@')).toBe('Invalid email format');
      expect(validateEmail('@example.com')).toBe('Invalid email format');
    });

    it('returns error for email too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe('Email is too long');
    });
  });

  describe('validatePassword', () => {
    it('returns null for valid password', () => {
      expect(validatePassword('StrongPass1!')).toBeNull();
    });

    it('returns error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('returns error for password too short', () => {
      expect(validatePassword('Short1!')).toBe('Password must be at least 8 characters');
    });

    it('returns error for missing uppercase', () => {
      expect(validatePassword('lowercase1!')).toBe(
        'Password must contain at least one uppercase letter'
      );
    });

    it('returns error for missing lowercase', () => {
      expect(validatePassword('UPPERCASE1!')).toBe(
        'Password must contain at least one lowercase letter'
      );
    });

    it('returns error for missing number', () => {
      expect(validatePassword('NoNumber!')).toBe('Password must contain at least one number');
    });

    it('returns error for missing special character', () => {
      expect(validatePassword('NoSpecial1')).toBe(
        'Password must contain at least one special character'
      );
    });

    it('returns error for password too long', () => {
      const longPassword = 'A'.repeat(130);
      expect(validatePassword(longPassword)).toBe('Password is too long');
    });
  });
});
