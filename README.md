# anchorpipe

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

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
   cp .env.example .env  # Create .env file
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

- **User Guides**: Coming soon
- **API Reference**: Coming soon
- **Integration Guides**: Coming soon
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) first.

### Quick Contribution Steps

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Sign off commits: `git commit -s -m "Your commit message"`
5. Push and create a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📋 Project Status

**Current Phase**: Foundation (Gate G0)

- ✅ Legal and governance foundation complete
- ✅ Project V2 board configured
- ✅ Development environment setup
- ⏳ Core platform development (in progress)

## 📖 License

This project is licensed under the **GNU Affero General Public License v3.0** (AGPL v3).

- **Open Source**: Core features under AGPL v3
- **Commercial Licensing**: Available for enterprises (see [docs/governance/COMMERCIAL_STRATEGY.md](docs/governance/COMMERCIAL_STRATEGY.md))

See [LICENSE](LICENSE) for details.

## 🛡️ Security

Please report security vulnerabilities privately. See [SECURITY.md](SECURITY.md) for details.

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

See our [GitHub Projects](https://github.com/orgs/anchorpipe/projects/3) board for the complete roadmap and issue tracking.

**Gates**:
- **G0** (Foundation): Repository setup, DB schema, CI/CD, Auth
- **GA** (Security): RBAC, Encryption, Input validation
- **GB** (Core Platform): GitHub App, CI integrations, Ingestion
- **GC** (MVP): Scoring, Dashboard, PR Bot
- **GD** (Post-MVP): Notifications, Performance, Plugins

---

**Made with ❤️ by the anchorpipe community**