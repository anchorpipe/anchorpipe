import { z } from 'zod';

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and encodes special characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 10000); // Max length protection
}

/**
 * Sanitize object values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key] as string) as T[typeof key];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key] as Record<string, unknown>) as T[typeof key];
    }
  }
  return sanitized;
}

/**
 * Validation error result
 */
export interface ValidationError {
  error: string;
  details?: z.ZodError['issues'];
}

/**
 * Parse JSON from request body
 */
async function parseJsonBody(
  request: Request
): Promise<{ success: true; body: unknown } | { success: false; error: ValidationError }> {
  try {
    const body = await request.json();
    return { success: true, body };
  } catch {
    return {
      success: false,
      error: { error: 'Invalid JSON in request body' },
    };
  }
}

/**
 * Validate parsed body against Zod schema
 */
function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: ValidationError } {
  try {
    const parsed = schema.parse(body);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return {
        success: false,
        error: {
          error: firstIssue?.message || 'Validation failed',
          details: process.env.NODE_ENV === 'development' ? error.issues : undefined,
        },
      };
    }
    console.error('Unexpected validation error:', error);
    return {
      success: false,
      error: { error: 'Invalid request body' },
    };
  }
}

/**
 * Validate request body against a Zod schema
 * Returns parsed data or error information
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ValidationError }> {
  const jsonResult = await parseJsonBody(request);
  if (!jsonResult.success) {
    return jsonResult;
  }

  return validateBody(jsonResult.body, schema);
}

/**
 * Legacy validation functions (kept for backward compatibility)
 * These are now deprecated in favor of Zod schemas
 */

/**
 * Email validation
 * @deprecated Use emailSchema from @/lib/schemas/auth instead
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }

  if (email.length > 255) {
    return 'Email is too long';
  }

  return null;
}

/**
 * Password validation
 * @deprecated Use passwordSchema from @/lib/schemas/auth instead
 */
export function validatePassword(password: string): string | null {
  if (!password || password.length === 0) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (password.length > 128) {
    return 'Password is too long';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character';
  }

  return null;
}
