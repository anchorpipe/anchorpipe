---
sidebar_position: 4
sidebar_label: 'Input Validation and Sanitization (ST-203)'
---

# Input Validation and Sanitization (ST-203)

## Overview

Implements comprehensive input validation using Zod schemas and XSS prevention via sanitization utilities. All API endpoints validate request bodies, and user inputs are sanitized before processing.

## Validation

### Zod Schemas

Location: `apps/web/src/lib/schemas/auth.ts`

Pre-defined schemas for common validation:

- `emailSchema` - Email format and length validation
- `passwordSchema` - Password strength requirements
- `registerSchema` - Registration request validation
- `loginSchema` - Login request validation

### Usage Example

```typescript
import { validateRequest } from '@/lib/validation';
import { registerSchema } from '@/lib/schemas/auth';

export async function POST(request: Request) {
  const result = await validateRequest(request, registerSchema);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.error, details: result.error.details },
      { status: 400 }
    );
  }

  const { email, password } = result.data; // Type-safe!
  // Process validated data...
}
```

### Validation Rules

**Email:**

- Required field
- Valid email format
- Maximum 255 characters

**Password:**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Maximum 128 characters

## Sanitization

### String Sanitization

Location: `apps/web/src/lib/validation.ts`

- Removes HTML tags (`<` and `>`)
- Trims whitespace
- Enforces maximum length (10,000 characters)
- Prevents XSS attacks

### Usage Example

```typescript
import { sanitizeString, sanitizeObject } from '@/lib/validation';

// Sanitize single string
const clean = sanitizeString(userInput);

// Sanitize object recursively
const cleanObject = sanitizeObject({ name: userInput, description: userInput2 });
```

### Object Sanitization

Recursively sanitizes all string values in an object, preserving structure.

## SQL Injection Prevention

- All database queries use Prisma ORM
- Prisma uses parameterized queries automatically
- No raw SQL queries with user input
- Type-safe database access

## Error Handling

### Validation Errors

Validation errors return structured responses:

```json
{
  "error": "Invalid email format",
  "details": [
    {
      "path": ["email"],
      "message": "Invalid email format"
    }
  ]
}
```

**Development Mode:**

- Full error details included
- Helpful debugging information

**Production Mode:**

- Generic error messages
- No sensitive information leaked

## Integration Points

### Authentication Endpoints

- `/api/auth/register` - Uses `registerSchema`
- `/api/auth/login` - Uses `loginSchema`

### Request Validation Flow

1. Parse JSON body
2. Validate against Zod schema
3. Sanitize string inputs
4. Process validated data
5. Return appropriate errors on failure

## Testing

### Unit Tests

Location: `apps/web/src/lib/__tests__/validation.test.ts`

Tests cover:

- Email validation
- Password validation
- Sanitization functions
- Error handling

### Integration Tests

Location: `apps/web/src/app/api/auth/__tests__/`

Tests cover:

- End-to-end validation flows
- Error responses
- Successful requests

## Best Practices

1. **Always validate at the edge** - Validate in API route handlers
2. **Use Zod schemas** - Type-safe validation with TypeScript inference
3. **Sanitize user input** - Prevent XSS attacks
4. **Don't trust client input** - Validate even from authenticated users
5. **Return helpful errors** - In development, provide detailed error messages
6. **Log validation failures** - Monitor for attack patterns

## Legacy Functions

Deprecated validation functions are kept for backward compatibility:

- `validateEmail()` - Use `emailSchema` instead
- `validatePassword()` - Use `passwordSchema` instead

These will be removed in a future version.

## Future Enhancements

- File upload validation
- Content-Type validation
- Request size limits
- Rate limiting per validation failure
- Custom validation rules per endpoint
