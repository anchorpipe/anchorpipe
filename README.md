# anchorpipe

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![CI](https://github.com/anchorpipe/anchorpipe/actions/workflows/ci.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/ci.yml)
[![Security Scanning](https://github.com/anchorpipe/anchorpipe/actions/workflows/security-scan.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/security-scan.yml)
[![CodeQL](https://github.com/anchorpipe/anchorpipe/actions/workflows/codeql.yml/badge.svg)](https://github.com/anchorpipe/anchorpipe/actions/workflows/codeql.yml)

**anchorpipe** is an open-source platform for flaky test management that is CI-native, transparent, and actionable—restoring developer velocity and release confidence across teams of all sizes.

## 🎯 Mission

Deliver a world-class, open-source platform for flaky test management that is CI-native, transparent, and actionable—restoring developer velocity and release confidence across teams of all sizes.

## ✨ Features

- **Universal Ingestion**: Support for all major CI platforms (GitHub Actions, GitLab CI, CircleCI, Jenkins, Azure DevOps) and testing frameworks (JUnit, Jest, PyTest, Playwright, Mocha, Gradle)
- **Explainable Scoring**: Advanced heuristics + ML-based flake detection with transparent explanations
- **PR Feedback**: Automated GitHub App that comments on PRs with flake detection and remediation suggestions
- **Multi-Platform**: Web dashboard, CLI tool, Desktop application (Tauri), and future MCP server
- **Actionable Insights**: Remediation playbooks, root cause analysis, and ownership mapping

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine) + Docker Compose V2
- Node.js 20.x LTS + npm 10.x
- Git >= 2.40

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/anchorpipe/anchorpipe.git
   cd anchorpipe
   ```

2. **Set up environment**

   ```bash
   # Create .env with DATABASE_URL for Prisma
   echo DATABASE_URL=postgresql://postgres:postgres@localhost:15432/anchorpipe_dev > .env
   docker compose up -d  # Start local services (Postgres, Redis, RabbitMQ, MinIO)
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed setup instructions.

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

### 📖 Guides

- **[CI Integration](docs/guides/integrations/ci-integration.md)** - Set up CI/CD integrations (GitHub Actions, GitLab CI, Jenkins, CircleCI)
- **[Security Guides](docs/guides/security/)**:
  - [OAuth Authentication](docs/guides/security/oauth.md) - OAuth 2.0 with PKCE
  - [Rate Limiting](docs/guides/security/rate-limiting.md) - Rate limiting and brute force protection
  - [Security Scanning](docs/guides/security/scanning.md) - Security scanning in CI
  - [Audit Logging](docs/guides/security/audit-logging.md) - Audit logging implementation
  - [Data Encryption](docs/guides/security/encryption.md) - Encryption at rest and in transit
  - [Data Subject Requests](docs/guides/security/data-subject-requests.md) - GDPR DSR workflow

### 📋 Reference

- **[Security Reference](docs/reference/security/)**:
  - [Incident Response](docs/reference/security/incident-response.md) - Security incident response plan
  - [Security Contacts](docs/reference/security/contacts.md) - Security team contacts
  - [Escalation Procedures](docs/reference/security/escalation.md) - Incident escalation

### 🏛️ Governance

- [Commercial Strategy](docs/governance/COMMERCIAL_STRATEGY.md) - Commercial licensing
- [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md) - Recognition framework
- [Foundation Plan](docs/governance/FOUNDATION_PLAN.md) - Foundation structure

### 📝 Additional

- [Documentation Index](docs/README.md) - Complete documentation overview
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security vulnerability reporting

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Quick Contribution Steps

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Sign off commits: `git commit -s -m "Your commit message"`
5. Push and create a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📖 License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL v3).

- **Open Source**: Core features under AGPL v3
- **Commercial Licensing**: Available for enterprises (see [docs/governance/COMMERCIAL_STRATEGY.md](docs/governance/COMMERCIAL_STRATEGY.md))

See [LICENSE](LICENSE) for details.

## 🛡️ Security

Please report security vulnerabilities privately. See [SECURITY.md](SECURITY.md) for details.

### Default Security Headers (GA: ST-204)

The web app sets baseline security headers globally and a conservative Content-Security-Policy (CSP) on API routes via `apps/web/src/middleware.ts`:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- API CSP (summary): `default-src 'none'; frame-ancestors 'none'; object-src 'none'; form-action 'self'` with minimal allowances for `img`, `script`, `style`, `connect`, `font`.

These provide immediate OWASP-aligned hardening without impacting development. Adjust CSP as needed when adding external resources.

## 📞 Support

- **General Questions**: [GitHub Discussions](https://github.com/anchorpipe/anchorpipe/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/anchorpipe/anchorpipe/issues)
- **Security Issues**: See [SECURITY.md](SECURITY.md)

## 🌟 Recognition

Contributors are recognized in release notes, contributors list, and project documentation. See [docs/governance/CONTRIBUTOR_REWARDS.md](docs/governance/CONTRIBUTOR_REWARDS.md) for our recognition and rewards framework.

## 📄 Additional Resources

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Governance Model](GOVERNANCE.md)
- [Intellectual Property Assignment](IP_ASSIGNMENT.md)
- [Trademark Policy](TRADEMARK_POLICY.md)
- [Commercial Strategy](docs/governance/COMMERCIAL_STRATEGY.md)

## 🗺️ Roadmap

See our [GitHub Projects](https://github.com/orgs/anchorpipe/projects/3/views/2) board for the complete roadmap and issue tracking.

---

**Made with ❤️ by the anchorpipe community**
