# Anchorpipe Documentation

Welcome to the Anchorpipe documentation! This directory contains all project documentation organized by purpose and audience.

## 🎯 I want to...

<table>
<tr>
<td width="33%">

### 🚀 Get Started

**New to anchorpipe?**

1. [Quick Start Guide](../README.md#-quick-start) (5 min)
2. [First CI Integration](guides/integrations/ci-integration.md#github-actions) (15 min)
3. [Project Setup](guides/foundation/project-setup.md) (30 min)

**Total time: ~50 minutes**

</td>
<td width="33%">

### 🔌 Integrate My Tools

**Connect your stack**

- [GitHub Actions](guides/integrations/ci-integration.md#github-actions)
- [GitLab CI](guides/integrations/ci-integration.md#gitlab-ci)
- [Jenkins](guides/integrations/ci-integration.md#jenkins)
- [CircleCI](guides/integrations/ci-integration.md#circleci)

[View all integrations →](guides/integrations/)

</td>
<td width="33%">

### 🔒 Secure My Instance

**Production-ready security**

1. [OAuth Setup](guides/security/oauth.md)
2. [RBAC Configuration](guides/security/rbac.md)
3. [Rate Limiting](guides/security/rate-limiting.md)
4. [Security Scanning](guides/security/scanning.md)

[View all security guides →](guides/security/)

</td>
</tr>
</table>

<details>
<summary><strong>👔 I'm an Enterprise Admin</strong></summary>

**Enterprise Setup Path:**

1. [Commercial Licensing](governance/COMMERCIAL_STRATEGY.md)
2. [Data Processing Agreement](reference/compliance/data-processing-agreement.md)
3. [Privacy Policy](reference/compliance/privacy-policy.md)
4. [Audit Logging](guides/security/audit-logging.md)
5. [Incident Response](reference/security/incident-response.md)

</details>

<details>
<summary><strong>🛠️ I'm a Contributor</strong></summary>

**Contribution Path:**

1. [Development Setup](guides/foundation/project-setup.md)
2. [Database Schema](guides/foundation/database-schema.md)
3. [API Gateway](guides/foundation/api-gateway.md)
4. [Contributing Guidelines](../CONTRIBUTING.md)
5. [Good First Issues](https://github.com/anchorpipe/anchorpipe/labels/good%20first%20issue)

</details>

## ⚡ Quick Links

### Most Popular 🔥

1. [GitHub Actions Integration](guides/integrations/ci-integration.md#github-actions) ⏱️ 15 min
2. [OAuth Authentication Setup](guides/security/oauth.md) ⏱️ 30 min
3. [Rate Limiting Configuration](guides/security/rate-limiting.md) ⏱️ 15 min
4. [Project Setup](guides/foundation/project-setup.md) ⏱️ 30 min

### By Role

<details>
<summary><strong>For Developers</strong></summary>

- [Local Development Setup](guides/foundation/project-setup.md)
- [API Gateway/BFF](guides/foundation/api-gateway.md)
- [Database Schema](guides/foundation/database-schema.md)
- [Authentication](guides/foundation/authentication.md)

</details>

<details>
<summary><strong>For DevOps Engineers</strong></summary>

- [CI/CD Pipeline Setup](guides/foundation/cicd-pipeline.md)
- [Message Queue Configuration](guides/foundation/message-queue.md)
- [Object Storage Setup](guides/foundation/object-storage.md)
- [Telemetry and Logging](guides/foundation/telemetry-logging.md)

</details>

<details>
<summary><strong>For Security Teams</strong></summary>

- [Security Scanning in CI](guides/security/scanning.md)
- [Audit Logging](guides/security/audit-logging.md)
- [Incident Response](reference/security/incident-response.md)
- [Security Contacts](reference/security/contacts.md)

</details>

<details>
<summary><strong>For Compliance Officers</strong></summary>

- [Privacy Policy](reference/compliance/privacy-policy.md)
- [Data Processing Agreement](reference/compliance/data-processing-agreement.md)
- [Data Retention Policy](reference/compliance/retention-policy.md)
- [Data Subject Requests](guides/security/data-subject-requests.md)

</details>

## 📁 Directory Structure

```
docs/
├── guides/                    # 📘 How-to guides and tutorials
│   │                           When to use: You want to accomplish a specific task
│   │
│   ├── foundation/           # 🏗️ Core platform setup (G0)
│   │                           For: Setting up anchorpipe from scratch
│   │
│   ├── integrations/         # 🔌 Connect external tools
│   │                           For: Integrating CI/CD and test frameworks
│   │
│   └── security/             # 🔒 Secure your deployment
│                               For: Production security hardening
│
├── reference/                # 📖 Technical reference docs
│   │                           When to use: You need detailed specs or lookup info
│   │
│   ├── security/             # 🛡️ Security procedures
│   └── compliance/           # ✅ Legal & compliance templates
│
├── program/                   # 🏗️ Internal architecture & planning
│   │                           When to use: You're contributing or need deep understanding
│   │
│   └── ADR/                  # Architecture decision records
│
└── governance/               # 🏛️ Community & commercial governance
    │                           When to use: You need licensing or community info
    │
    ├── COMMERCIAL_STRATEGY.md
    ├── CONTRIBUTOR_REWARDS.md
    └── FOUNDATION_PLAN.md
```

## 📚 Documentation Categories

### Guides (`guides/`)

Step-by-step guides for common tasks and integrations.

#### Foundation Guides (`guides/foundation/`)

Core platform setup and infrastructure:

- **[Project Setup](guides/foundation/project-setup.md)** (ST-101) ⏱️ 30 min - Development environment and tooling
- **[Database Schema](guides/foundation/database-schema.md)** (ST-102) ⏱️ 45 min - PostgreSQL schema and Prisma
- **[CI/CD Pipeline](guides/foundation/cicd-pipeline.md)** (ST-103) ⏱️ 30 min - GitHub Actions workflows
- **[Authentication](guides/foundation/authentication.md)** (ST-104) ⏱️ 30 min - User registration and login
- **[API Gateway/BFF](guides/foundation/api-gateway.md)** (ST-105) ⏱️ 30 min - Next.js route handlers
- **[Message Queue](guides/foundation/message-queue.md)** (ST-106) ⏱️ 30 min - RabbitMQ setup
- **[Object Storage](guides/foundation/object-storage.md)** (ST-107) ⏱️ 30 min - MinIO/S3 setup
- **[Telemetry and Logging](guides/foundation/telemetry-logging.md)** (ST-108) ⏱️ 30 min - Observability

#### Integration Guides (`guides/integrations/`)

- **[CI Integration](guides/integrations/ci-integration.md)** ⏱️ 20 min - Setting up CI/CD integrations with Anchorpipe
  - GitHub Actions, GitLab CI, Jenkins, CircleCI
  - Code examples (Python, Node.js, Bash)

#### Security Guides (`guides/security/`)

Production security features:

- **[Audit Logging](guides/security/audit-logging.md)** (ST-206) ⏱️ 20 min - Implementing and using audit logging
- **[Data Encryption](guides/security/encryption.md)** (ST-202) ⏱️ 20 min - Encryption at rest and in transit
- **[Input Validation](guides/security/input-validation.md)** (ST-203) ⏱️ 15 min - Input validation and sanitization
- **[OAuth Authentication](guides/security/oauth.md)** (ST-207) ⏱️ 45 min - OAuth 2.0 with PKCE implementation
- **[RBAC System](guides/security/rbac.md)** (ST-201) ⏱️ 30 min - Role-based access control
- **[Rate Limiting](guides/security/rate-limiting.md)** (ST-210) ⏱️ 15 min - Rate limiting and brute force protection
- **[Security Headers](guides/security/security-headers.md)** (ST-204) ⏱️ 15 min - Security headers and CSP
- **[Security Scanning](guides/security/scanning.md)** (ST-209) ⏱️ 20 min - Security scanning in CI pipeline
- **[Data Subject Requests](guides/security/data-subject-requests.md)** (ST-205) ⏱️ 30 min - GDPR DSR workflow

### Reference (`reference/`)

Reference documentation for APIs, security procedures, and technical details.

#### Security Reference (`reference/security/`)

- **[Incident Response](reference/security/incident-response.md)** ⏱️ 30 min read - Security incident response plan
- **[Security Contacts](reference/security/contacts.md)** ⏱️ 10 min read - Security team contacts and roles
- **[Escalation Procedures](reference/security/escalation.md)** ⏱️ 15 min read - Security incident escalation

#### Compliance Reference (`reference/compliance/`)

- **[Privacy Policy](reference/compliance/privacy-policy.md)** ⏱️ 20 min read - Comprehensive privacy policy (GDPR/CCPA compliant)
- **[Data Processing Agreement](reference/compliance/data-processing-agreement.md)** ⏱️ 30 min read - DPA for enterprise customers
- **[Retention Policy](reference/compliance/retention-policy.md)** ⏱️ 15 min read - Data retention periods and deletion processes

### Program Documentation (`program/`)

Internal program documentation (architecture, PRD, compliance, etc.)

- Architecture Decision Records (ADR) - Technical decisions and rationale

### Governance (`governance/`)

- **[Commercial Strategy](governance/COMMERCIAL_STRATEGY.md)** - Commercial licensing and strategy
- **[Contributor Rewards](governance/CONTRIBUTOR_REWARDS.md)** - Recognition and rewards framework
- **[Foundation Plan](governance/FOUNDATION_PLAN.md)** - Foundation planning and structure

## 🔍 Find What You Need

**Search by keyword:**

- **CI/CD**: [Integration Guide](guides/integrations/ci-integration.md), [CI/CD Pipeline](guides/foundation/cicd-pipeline.md)
- **Security**: [All Security Guides](guides/security/), [Incident Response](reference/security/incident-response.md)
- **Database**: [Schema Guide](guides/foundation/database-schema.md), [Retention Policy](reference/compliance/retention-policy.md)
- **API**: [API Gateway](guides/foundation/api-gateway.md)
- **Authentication**: [Auth Guide](guides/foundation/authentication.md), [OAuth](guides/security/oauth.md), [RBAC](guides/security/rbac.md)

**Browse by category:**

- [📘 All Guides](guides/) - Step-by-step tutorials
- [📖 All Reference Docs](reference/) - Technical reference
- [🏛️ Governance](governance/) - Commercial & community
- [🏗️ Program](program/) - Architecture & planning

**Can't find it?** Use `Cmd/Ctrl + F` or [search the repo](https://github.com/anchorpipe/anchorpipe/search?type=code)

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

- [Main README](../README.md) - Project overview
- [SECURITY.md](../SECURITY.md) - Security policy
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [Architecture Decision Records](../adr/) - Technical decisions

## 📝 Documentation Status

| Category              | Status      | Completeness | Notes                                   |
| --------------------- | ----------- | ------------ | --------------------------------------- |
| Foundation Guides     | ✅ Complete | 100% (8/8)   | All G0 foundation stories documented    |
| Integration Guides    | ✅ Complete | 100% (1/1)   | CI integration documented               |
| Security Guides       | ✅ Complete | 100% (9/9)   | All security features documented        |
| Security Reference    | ✅ Complete | 100% (3/3)   | Incident response procedures documented |
| Compliance Reference  | ✅ Complete | 100% (3/3)   | Privacy policy, DPA, retention policy   |
| Program Documentation | ⏳ Pending  | 0% (0/4)     | Internal docs to be added               |
| API Reference         | ⏳ Pending  | 0% (0/1)     | API documentation coming soon           |
| CLI Reference         | ⏳ Pending  | 0% (0/1)     | CLI documentation coming soon           |

**Overall Progress:** 67% complete (24/36 planned docs)

---

**Last Updated**: 2025-11-09
