# Contributing to anchorpipe

Thank you for your interest in contributing to anchorpipe! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Developer Certificate of Origin (DCO)

anchorpipe uses the [Developer Certificate of Origin (DCO)](https://developercertificate.org/) instead of a Contributor License Agreement (CLA). This is a lightweight process that certifies you wrote the code or have the right to contribute it.

### How to Sign Off

Every commit must be signed off. This certifies that:

- You wrote the code, or
- You have the right to contribute the code, and
- You understand your contributions are made under the project's license (AGPL v3)

### Intellectual Property and Commercial Use Rights

By contributing to anchorpipe, you grant the following rights:

- **Open-Source License**: Your contributions are licensed under AGPL v3
- **Commercial Use Rights**: anchorpipe may use your contributions in commercial products and services
- **Dual Licensing**: anchorpipe may license your contributions under different licenses for commercial use
- **Attribution**: You will be credited for your contributions

**Important**: You retain copyright ownership of your code. You are granting licenses that allow both open-source and commercial use.

For complete details, see [IP_ASSIGNMENT.md](IP_ASSIGNMENT.md).

**Note**: Significant contributors who may receive equity or compensation may be asked to sign an additional Contributor License Agreement (CLA) with more explicit terms. This is optional and only for contributors receiving compensation.

### Signing Off Commits

Add `-s` or `--signoff` to your git commit:

```bash
git commit -s -m "Your commit message"
```

Or manually add the signoff line:

```
Signed-off-by: Your Name <your.email@example.com>
```

### Automatic Sign-off (Recommended)

Set up your git to automatically sign off commits:

```bash
git config --global format.signoff true
```

### GitHub UI Sign-off

When creating PRs via GitHub UI, include this text in your PR description:

```
I certify that I wrote the code or have the right to contribute it under the project's license.

Signed-off-by: Your Name <your.email@example.com>
```

## Getting Started

1. **Fork the repository** and clone your fork
2. **Create a branch** for your work: `git checkout -b feature/your-feature-name`
3. **Set up development environment** - see [docs/contributing/setup.md](docs/contributing/setup.md)
4. **Make your changes** following our coding standards
5. **Test your changes** - ensure all tests pass
6. **Sign off your commits** - use `git commit -s`
7. **Push to your fork** and create a Pull Request

## Pull Request Process

1. **Link to an issue** - All PRs should reference an issue (fixes #123)
2. **Keep PRs focused** - One feature or fix per PR
3. **Write clear commit messages** - Use [Conventional Commits](https://www.conventionalcommits.org/)
4. **Ensure CI passes** - All checks must be green
5. **Request review** - Add relevant reviewers based on CODEOWNERS
6. **Address feedback** - Respond to review comments promptly

## Coding Standards

- **TypeScript/JavaScript**: Follow ESLint and Prettier configurations
- **Testing**: Write tests for new features and bug fixes
- **Documentation**: Update relevant docs when adding features
- **Accessibility**: Follow WCAG 2.2 AA standards
- **Performance**: Meet performance budgets (see quality handbook)

See [docs/contributing/coding-standards.md](docs/contributing/coding-standards.md) for detailed guidelines.

## Project Structure

- `apps/` - Applications (web, CLI, desktop)
- `libs/` - Shared libraries and packages (Nx default; intentionally not named `packages/`)
- `services/` - Backend services (ingestion, scoring)
- `docs/` - Public documentation (Docusaurus)
- `docs/internal/` - Internal documentation (planning, ADRs)
- `.github/` - GitHub workflows and templates

## Naming & Directory Conventions

Follow the repository structure guidance in [`anchorpipe_guide_docs/impo/repo-structure-guide.md`](anchorpipe_guide_docs/impo/repo-structure-guide.md):

- **Directories**: `kebab-case` (e.g., `test-report-parsers/`, `role-audit/`).
- **TypeScript/JavaScript files**: `camelCase` (e.g., `rbacService.ts`); export defaults avoided unless necessary.
- **Rust/Python files**: `snake_case` per language norms.
- **Scripts**: `kebab-case` for shell (`deploy.sh`), `snake_case` for Python (`db_migrate.py`).
- **ADRs**: `NNNN-title-words-separated-by-hyphens.md` (see [`adr/README.md`](adr/README.md)).
- **Tests**: colocate next to source with `.test.ts` suffix or within `__tests__/`.
- **README expectation**: Each top-level directory (`apps/<name>`, `libs/<name>`, `services/<name>`, `infra/`) must include a `README.md` documenting purpose, setup, and operational notes.

When creating new libraries or services:

1. Use Nx generators where available (`nx g @nx/node:lib my-lib`).
2. Respect workspace aliases (`@anchorpipe/*`).
3. Update this section if new naming rules are introduced.

## Areas for Contribution

- **Bug fixes** - Check issues labeled `type:bug`
- **Features** - Check issues labeled `type:feature` and `status:ready`
- **Documentation** - Improve docs, add examples, fix typos
- **Testing** - Add tests, improve coverage
- **Accessibility** - Improve a11y compliance
- **Performance** - Optimize code, reduce bundle size

## Questions?

- **General questions**: Use [GitHub Discussions Q&A](https://github.com/anchorpipe/anchorpipe/discussions/c/q-a)
- **Feature ideas**: Use [GitHub Discussions Ideas](https://github.com/anchorpipe/anchorpipe/discussions/c/ideas)
- **Security issues**: See [SECURITY.md](SECURITY.md)

## Recognition

Contributors are recognized in:

- Release notes
- Contributors list in README
- Project website (coming soon)

Thank you for contributing to anchorpipe! 🚀
