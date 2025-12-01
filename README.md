# anchorpipe

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![CI](https://github.com/anchorpipe/anchorpipe/actions/workflows/ci.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/ci.yml)
[![Security Scanning](https://github.com/anchorpipe/anchorpipe/actions/workflows/security-scan.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/security-scan.yml)
[![CodeQL](https://github.com/anchorpipe/anchorpipe/actions/workflows/codeql.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/codeql.yml)
[![codecov](https://codecov.io/gh/anchorpipe/anchorpipe/branch/main/graph/badge.svg)](https://codecov.io/gh/anchorpipe/anchorpipe)

**anchorpipe** is an open-source platform for flaky test management that is CI-native, transparent, and actionable—restoring developer velocity and release confidence across teams of all sizes.

> 📚 Looking for documentation? Visit [anchorpipe-docs.vercel.app](https://anchorpipe-docs.vercel.app) for the full site.

## Why anchorpipe?

Flaky tests destroy developer productivity. Teams waste hours investigating false failures, delaying releases, and losing trust in their test suites.

**anchorpipe** automatically detects, explains, and helps you fix flaky tests—integrated directly into your CI/CD workflow.

### The Problem

- ❌ Tests that pass/fail randomly waste hours of debugging
- ❌ Teams lose confidence in their test suites
- ❌ Releases get delayed due to test uncertainty
- ❌ No visibility into which tests are truly broken vs. flaky

### The Solution

- ✅ **Automatic detection** using ML-based heuristics
- ✅ **Transparent explanations** for every flake
- ✅ **PR-native feedback** - catch flakes before merge
- ✅ **Actionable remediation** with guided playbooks

## ✨ Key Features

### 🔌 Universal CI Integration

Works with your existing CI/CD pipeline—no migration required.

**Supported Platforms:**

- GitHub Actions, GitLab CI, CircleCI, Jenkins, Azure DevOps
- JUnit, Jest, PyTest, Playwright, Mocha, Gradle

[View integration guide →](https://anchorpipe-docs.vercel.app/docs/guides/integrations/ci-integration)

### 🔒 Production-Ready Security

Enterprise-grade security features built-in:

- OAuth 2.0 with PKCE authentication
- Role-based access control (RBAC)
- Rate limiting and brute force protection
- Encryption at rest and in transit
- Comprehensive audit logging
- Security scanning in CI pipeline

[View security documentation →](https://anchorpipe-docs.vercel.app/docs/guides/security/)

### 📊 Compliance & Privacy

GDPR/CCPA compliant with comprehensive data protection:

- Privacy policy and data processing agreements
- Data subject request (DSR) workflows
- Data retention policies
- Audit trails for compliance

[View compliance documentation →](https://anchorpipe-docs.vercel.app/docs/reference/compliance/)

## Recent Improvements

### Production-Ready Infrastructure (Jan 2025)

✅ **Tests in CI** - All tests run on every PR with coverage reporting  
✅ **Redis Rate Limiting** - Distributed rate limiting across instances  
✅ **Robust Idempotency** - ACID-guaranteed duplicate prevention

See [Architecture Guides](https://anchorpipe-docs.vercel.app/docs/guides/architecture/) for details.

## 🚀 Quick Start

Get anchorpipe running locally in under 5 minutes.

### Prerequisites

- Docker Desktop (or Docker Engine) + Docker Compose V2
- Node.js 20.x LTS + npm 10.x
- Git >= 2.40

### Setup Steps

1. **Clone and enter directory**

   ```bash
   git clone https://github.com/anchorpipe/anchorpipe.git
   cd anchorpipe
   ```

2. **Start infrastructure**

   ```bash
   # Create .env with DATABASE_URL
   echo DATABASE_URL=postgresql://postgres:postgres@localhost:15432/anchorpipe_dev > .env

   # Start local services (PostgreSQL, Redis, RabbitMQ, MinIO)
   docker compose up -d
   ```

3. **Install and setup**

   ```bash
   npm install
   npm run db:migrate
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Verify installation**

   ```bash
   curl http://localhost:3000/api/health
   ```

   **✅ Expected output:** `{"status": "healthy"}`

### Next Steps

- 📖 [Connect your first CI pipeline](https://anchorpipe-docs.vercel.app/docs/guides/integrations/ci-integration)
- 🔒 [Configure authentication](https://anchorpipe-docs.vercel.app/docs/guides/foundation/authentication)
- 🛡️ [Set up security features](https://anchorpipe-docs.vercel.app/docs/guides/security/)

**Troubleshooting:** See [Project Setup Guide](https://anchorpipe-docs.vercel.app/docs/guides/foundation/project-setup) for detailed instructions.

## 📚 Documentation

| Category               | Resources                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🚀 Getting Started** | [Quick Start](#-quick-start) · [Project Setup](https://anchorpipe-docs.vercel.app/docs/guides/foundation/project-setup) · [CI Integration](https://anchorpipe-docs.vercel.app/docs/guides/integrations/ci-integration)                                                                                                    |
| **🔌 Integrations**    | [CI/CD Setup](https://anchorpipe-docs.vercel.app/docs/guides/integrations/) · [HMAC Authentication](https://anchorpipe-docs.vercel.app/docs/guides/integrations/ci-integration)                                                                                                                                           |
| **🔒 Security**        | [OAuth](https://anchorpipe-docs.vercel.app/docs/guides/security/oauth) · [RBAC](https://anchorpipe-docs.vercel.app/docs/guides/security/rbac) · [Rate Limiting](https://anchorpipe-docs.vercel.app/docs/guides/security/rate-limiting) · [Encryption](https://anchorpipe-docs.vercel.app/docs/guides/security/encryption) |
| **🏗️ Foundation**      | [Database Schema](https://anchorpipe-docs.vercel.app/docs/guides/foundation/database-schema) · [API Gateway](https://anchorpipe-docs.vercel.app/docs/guides/foundation/api-gateway) · [Message Queue](https://anchorpipe-docs.vercel.app/docs/guides/foundation/message-queue)                                            |
| **🏛️ Governance**      | [Commercial Strategy](https://anchorpipe-docs.vercel.app/docs/governance/COMMERCIAL_STRATEGY) · [Contributor Rewards](https://anchorpipe-docs.vercel.app/docs/governance/CONTRIBUTOR_REWARDS)                                                                                                                             |
| **📖 Reference**       | [Security Reference](https://anchorpipe-docs.vercel.app/docs/reference/security/) · [Compliance](https://anchorpipe-docs.vercel.app/docs/reference/compliance/) · [Complete Index](https://anchorpipe-docs.vercel.app/docs/intro)                                                                                         |

**Can't find what you need?** [Browse all documentation](https://anchorpipe-docs.vercel.app/docs/intro) or [ask in Discussions](https://github.com/anchorpipe/anchorpipe/discussions)

## 🤝 Contributing

We ❤️ contributions! anchorpipe is built by developers, for developers.

**Ways to Contribute:**

- 🐛 [Report bugs](https://github.com/anchorpipe/anchorpipe/issues/new?template=bug_report.md)
- 💡 [Suggest features](https://github.com/anchorpipe/anchorpipe/issues/new?template=feature_request.md)
- 📖 Improve documentation
- 🔧 Submit pull requests
- 💬 Help others in [Discussions](https://github.com/anchorpipe/anchorpipe/discussions)

**First-time contributor?** Look for [`good first issue`](https://github.com/anchorpipe/anchorpipe/labels/good%20first%20issue) labels.

### Quick Contribution Steps

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** with sign-off: `git commit -s -m "Add amazing feature"`
4. **Push** and open a Pull Request

[Read our full Contributing Guide →](CONTRIBUTING.md)

**Recognition:** All contributors get credit in release notes and our [Contributors Wall](https://github.com/anchorpipe/anchorpipe/graphs/contributors). Learn about our [rewards program](https://anchorpipe-docs.vercel.app/docs/governance/CONTRIBUTOR_REWARDS).

## 🛡️ Security

Security is a top priority. anchorpipe includes:

✅ OAuth 2.0 with PKCE  
✅ OWASP-aligned security headers  
✅ Rate limiting & brute force protection  
✅ Encryption at rest and in transit  
✅ Comprehensive audit logging  
✅ Security scanning in CI pipeline

**Found a vulnerability?** Please report it privately via our [Security Policy](SECURITY.md).

[View detailed security documentation →](https://anchorpipe-docs.vercel.app/docs/guides/security/)

## 📖 License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL v3).

- **Open Source**: Core features under AGPL v3
- **Commercial Licensing**: Available for enterprises (see [docs/governance/COMMERCIAL_STRATEGY.md](https://anchorpipe-docs.vercel.app/docs/governance/COMMERCIAL_STRATEGY))

See [LICENSE](LICENSE) for details.

## 📞 Support

- **General Questions**: [GitHub Discussions](https://github.com/anchorpipe/anchorpipe/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/anchorpipe/anchorpipe/issues)
- **Security Issues**: See [SECURITY.md](SECURITY.md)

## 🗺️ Roadmap

See our [GitHub Projects](https://github.com/orgs/anchorpipe/projects/3/views/2) board for the complete roadmap and issue tracking.

---

**Made with ❤️ by the anchorpipe community**
