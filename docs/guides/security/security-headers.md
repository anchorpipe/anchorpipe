# Security Headers and CSP (ST-204)

## Overview

Implements comprehensive security headers globally and Content Security Policy (CSP) for API routes. All responses include security headers to protect against common web vulnerabilities.

## Global Security Headers

Applied to all responses via Next.js middleware.

Location: `apps/web/src/middleware.ts`

### Headers Applied

- **X-Content-Type-Options**: `nosniff`
  - Prevents MIME type sniffing attacks

- **X-Frame-Options**: `DENY`
  - Prevents clickjacking attacks
  - Blocks all framing attempts

- **Referrer-Policy**: `no-referrer`
  - Prevents referrer information leakage

- **Permissions-Policy**: `geolocation=(), microphone=(), camera=()`
  - Disables geolocation, microphone, and camera access

- **Cross-Origin-Opener-Policy**: `same-origin`
  - Isolates browsing context to same-origin

- **Cross-Origin-Resource-Policy**: `same-origin`
  - Restricts resource loading to same-origin

- **Strict-Transport-Security** (HSTS): `max-age=31536000; includeSubDomains; preload`
  - Enforces HTTPS connections
  - **Production only** (not applied in development)

## Content Security Policy (CSP)

Applied specifically to API routes (`/api/*`).

### CSP Directives

```
default-src 'none';
base-uri 'self';
frame-ancestors 'none';
img-src 'self' data:;
script-src 'self';
style-src 'self' 'unsafe-inline';
connect-src 'self';
font-src 'self' data:;
object-src 'none';
form-action 'self';
```

### Directive Explanations

- **default-src 'none'**: Deny all resources by default
- **base-uri 'self'**: Allow base tags only from same origin
- **frame-ancestors 'none'**: Prevent framing (complements X-Frame-Options)
- **img-src 'self' data:** Allow images from same origin and data URIs
- **script-src 'self'**: Allow scripts only from same origin
- **style-src 'self' 'unsafe-inline'**: Allow styles from same origin and inline styles
- **connect-src 'self'**: Allow fetch/XHR only to same origin
- **font-src 'self' data:** Allow fonts from same origin and data URIs
- **object-src 'none'**: Block plugins (Flash, etc.)
- **form-action 'self'**: Allow form submissions only to same origin

## Implementation

### Middleware Function

```typescript
function applySecurityHeaders(response: NextResponse) {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  response.headers.set('cross-origin-resource-policy', 'same-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'strict-transport-security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}
```

### CSP Application

```typescript
function maybeAttachApiCsp(pathname: string, response: NextResponse) {
  if (!pathname.startsWith('/api/')) return;

  const csp = [
    "default-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    // ... other directives
  ].join('; ');

  response.headers.set('content-security-policy', csp);
}
```

## HSTS Configuration

HSTS (HTTP Strict Transport Security) is only enabled in production:

- **max-age**: 31536000 seconds (1 year)
- **includeSubDomains**: Applies to all subdomains
- **preload**: Eligible for HSTS preload lists

**Why not in development?**

- Local development often uses HTTP
- Prevents issues with localhost and development servers

## Testing

### Header Verification

Use browser DevTools or curl to verify headers:

```bash
curl -I https://anchorpipe.dev/api/health
```

Expected headers:

```
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: no-referrer
content-security-policy: default-src 'none'; ...
strict-transport-security: max-age=31536000; includeSubDomains; preload
```

### CSP Violation Reporting

CSP violations can be reported to a reporting endpoint (future enhancement):

```typescript
// Future: Add report-uri directive
'report-uri /api/csp-report';
```

## Browser Compatibility

All security headers are supported in modern browsers:

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support

## Adjusting CSP

### Adding External Resources

If you need to load external resources, update CSP:

```typescript
// Example: Allow external CDN for scripts
"script-src 'self' https://cdn.example.com";
```

### Nonce-Based CSP (Future)

For inline scripts, consider nonce-based CSP:

```typescript
const nonce = generateNonce();
response.headers.set('content-security-policy', `script-src 'self' 'nonce-${nonce}'`);
```

## Best Practices

1. **Start restrictive** - Begin with `default-src 'none'` and add exceptions
2. **Test thoroughly** - Verify CSP doesn't break functionality
3. **Monitor violations** - Set up CSP violation reporting
4. **Keep updated** - Review and update CSP as features are added
5. **Document changes** - Update this doc when CSP is modified

## Related Documentation

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload](https://hstspreload.org/)

## Future Enhancements

- CSP violation reporting endpoint
- Nonce-based CSP for inline scripts
- Separate CSP policies per route
- CSP reporting and monitoring dashboard
