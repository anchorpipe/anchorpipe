# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

- **Email**: security@anchorpipe.org (preferred)
- **GitHub Security Advisories**: Use the "Report a vulnerability" button on the [Security tab](https://github.com/anchorpipe/anchorpipe/security/advisories)

### What to Include

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity (see below)

## Security Severity Levels

### Critical

- Remote code execution
- SQL injection
- Authentication bypass
- Data breach/exfiltration
- **Resolution Target**: 24-48 hours

### High

- Privilege escalation
- Cross-site scripting (XSS)
- CSRF with significant impact
- Insecure data storage
- **Resolution Target**: 7 days

### Medium

- Information disclosure
- Denial of service
- CSRF with limited impact
- **Resolution Target**: 30 days

### Low

- Security best practices violations
- Minor information leaks
- **Resolution Target**: Next release

## Security Best Practices

We follow these practices:

- **Security by Default**: Least privilege, secure defaults
- **Input Validation**: All inputs validated with Zod
- **Authentication**: OAuth 2.0 PKCE, HMAC for CI
- **Encryption**: TLS 1.2+, AES-256 at rest
- **Dependency Scanning**: CodeQL, Dependabot
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **Audit Logging**: All sensitive actions logged

See [docs/program/08-quality-handbook.md](docs/program/08-quality-handbook.md) for detailed security guidelines.

## Responsible Disclosure

We appreciate responsible disclosure. We will:

- Acknowledge your report promptly
- Work with you to understand and validate the issue
- Keep you informed of our progress
- Credit you in security advisories (with your permission)
- Work to fix the issue quickly

## Security Updates

Security updates are released through:

- GitHub Security Advisories
- Release notes with security sections
- Security mailing list (coming soon)

## Known Security Considerations

- **CI Integration**: Uses HMAC signatures for authentication
- **Data Storage**: Test data encrypted at rest, PII minimized
- **Third-party Integrations**: All integrations reviewed for security
- **Dependencies**: Regularly updated via Dependabot

## Security Audit

We conduct regular security audits:

- **Automated**: Weekly via CodeQL and Dependabot
- **Manual**: Before major releases
- **External**: Planned for Gate D (pre-launch)

## Security Incident Response

We have a comprehensive Security Incident Response Plan (IRP) for handling security incidents:

- **Incident Response Plan**: See [docs/reference/security/incident-response.md](docs/reference/security/incident-response.md)
- **Security Contacts**: See [docs/reference/security/contacts.md](docs/reference/security/contacts.md)
- **Escalation Procedures**: See [docs/reference/security/escalation.md](docs/reference/security/escalation.md)

### Incident Reporting

For security incidents:

1. **Critical/High**: Contact security@anchorpipe.org immediately
2. **Medium/Low**: Report via security@anchorpipe.org or GitHub Security Advisories
3. **Response Times**: See [incident-response.md](docs/reference/security/incident-response.md) for details

## Contact

- **Security Issues**: Use GitHub Security Advisories or email security@anchorpipe.org
- **Security Incidents**: See [incident-response.md](docs/reference/security/incident-response.md)
- **General Questions**: GitHub Discussions
- **Enterprise Security**: Contact commercial team (when available)
