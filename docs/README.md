# Anchorpipe Documentation

Welcome to the Anchorpipe documentation! This directory contains all project documentation organized by purpose and audience.

## 📁 Directory Structure

```
docs/
├── guides/                    # How-to guides and tutorials
│   ├── foundation/          # Foundation (G0) guides
│   ├── integrations/         # CI/CD integration guides
│   └── security/             # Security implementation guides
├── reference/                # API, CLI, and reference documentation
│   ├── security/             # Security reference documentation
│   └── compliance/           # Compliance documentation
├── program/                   # Internal program documentation
├── governance/               # Governance and commercial strategy
└── README.md                 # This file
```

## 📚 Documentation Categories

### Guides (`guides/`)

Step-by-step guides for common tasks and integrations.

#### Integration Guides (`guides/integrations/`)

- **[CI Integration](guides/integrations/ci-integration.md)** - Setting up CI/CD integrations with Anchorpipe
  - GitHub Actions
  - GitLab CI
  - Jenkins
  - CircleCI
  - Code examples (Python, Node.js, Bash)

#### Foundation Guides (`guides/foundation/`)

- **[Project Setup](guides/foundation/project-setup.md)** (ST-101) - Development environment and tooling
- **[Database Schema](guides/foundation/database-schema.md)** (ST-102) - PostgreSQL schema and Prisma
- **[CI/CD Pipeline](guides/foundation/cicd-pipeline.md)** (ST-103) - GitHub Actions workflows
- **[Authentication](guides/foundation/authentication.md)** (ST-104) - User registration and login
- **[API Gateway/BFF](guides/foundation/api-gateway.md)** (ST-105) - Next.js route handlers
- **[Message Queue](guides/foundation/message-queue.md)** (ST-106) - RabbitMQ setup
- **[Object Storage](guides/foundation/object-storage.md)** (ST-107) - MinIO/S3 setup
- **[Telemetry and Logging](guides/foundation/telemetry-logging.md)** (ST-108) - Observability

#### Security Guides (`guides/security/`)

- **[Audit Logging](guides/security/audit-logging.md)** (ST-206) - Implementing and using audit logging
- **[Data Encryption](guides/security/encryption.md)** (ST-202) - Encryption at rest and in transit
- **[Input Validation](guides/security/input-validation.md)** (ST-203) - Input validation and sanitization
- **[OAuth Authentication](guides/security/oauth.md)** (ST-207) - OAuth 2.0 with PKCE implementation
- **[RBAC System](guides/security/rbac.md)** (ST-201) - Role-based access control
- **[Rate Limiting](guides/security/rate-limiting.md)** (ST-210) - Rate limiting and brute force protection
- **[Security Headers](guides/security/security-headers.md)** (ST-204) - Security headers and CSP
- **[Security Scanning](guides/security/scanning.md)** (ST-209) - Security scanning in CI pipeline
- **[Data Subject Requests](guides/security/data-subject-requests.md)** (ST-205) - GDPR DSR workflow

### Reference (`reference/`)

Reference documentation for APIs, security procedures, and technical details.

#### Security Reference (`reference/security/`)

- **[Incident Response](reference/security/incident-response.md)** - Security incident response plan
- **[Security Contacts](reference/security/contacts.md)** - Security team contacts and roles
- **[Escalation Procedures](reference/security/escalation.md)** - Security incident escalation

#### Compliance Reference (`reference/compliance/`)

- **[Privacy Policy](reference/compliance/privacy-policy.md)** - Comprehensive privacy policy (GDPR/CCPA compliant)
- **[Data Processing Agreement](reference/compliance/data-processing-agreement.md)** - DPA for enterprise customers
- **[Retention Policy](reference/compliance/retention-policy.md)** - Data retention periods and deletion processes

### Program Documentation (`program/`)

Internal program documentation (architecture, PRD, compliance, etc.)

- Coming soon: Architecture documents, PRD, compliance documentation

### Governance (`governance/`)

- **[Commercial Strategy](governance/COMMERCIAL_STRATEGY.md)** - Commercial licensing and strategy
- **[Contributor Rewards](governance/CONTRIBUTOR_REWARDS.md)** - Recognition and rewards framework
- **[Foundation Plan](governance/FOUNDATION_PLAN.md)** - Foundation planning and structure

## 🔍 Quick Links

### Getting Started

- [CI Integration Guide](guides/integrations/ci-integration.md) - Set up CI/CD integration
- [OAuth Authentication](guides/security/oauth.md) - Configure OAuth login

### Security

- [Security Policy](../../SECURITY.md) - Vulnerability reporting
- [Incident Response](reference/security/incident-response.md) - Security incident procedures
- [Rate Limiting](guides/security/rate-limiting.md) - Configure rate limits
- [Security Scanning](guides/security/scanning.md) - Security scanning setup

### Reference

- [Security Contacts](reference/security/contacts.md) - Security team contacts
- [Escalation Procedures](reference/security/escalation.md) - Incident escalation
- [Privacy Policy](reference/compliance/privacy-policy.md) - Privacy policy and user rights
- [Data Processing Agreement](reference/compliance/data-processing-agreement.md) - Enterprise DPA
- [Retention Policy](reference/compliance/retention-policy.md) - Data retention periods

## 📖 Documentation Standards

- **Format**: Markdown (`.md`)
- **Naming**: `kebab-case` for file names
- **Structure**: Clear headings, table of contents for long documents
- **Links**: Use relative paths for internal links
- **Code Examples**: Include working examples with explanations

## 🤝 Contributing to Documentation

1. Follow the directory structure above
2. Use clear, concise language
3. Include code examples where applicable
4. Update this README when adding new documentation
5. Link related documents appropriately

## 🔗 Related Resources

- [Main README](../../README.md) - Project overview
- [SECURITY.md](../../SECURITY.md) - Security policy
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Contribution guidelines
- [Architecture Decision Records](../../adr/) - Technical decisions

## 📝 Documentation Status

| Category              | Status      | Notes                                   |
| --------------------- | ----------- | --------------------------------------- |
| Foundation Guides     | ✅ Complete | All G0 foundation stories documented    |
| Integration Guides    | ✅ Complete | CI integration documented               |
| Security Guides       | ✅ Complete | All security features documented        |
| Security Reference    | ✅ Complete | Incident response procedures documented |
| Compliance Reference  | ✅ Complete | Privacy policy, DPA, retention policy   |
| Program Documentation | ⏳ Pending  | Internal docs to be added               |
| API Reference         | ⏳ Pending  | API documentation coming soon           |
| CLI Reference         | ⏳ Pending  | CLI documentation coming soon           |

---

**Last Updated**: 2025-11-08
