# anchorpipe Documentation

This directory contains public-facing documentation for the anchorpipe project.

## Documentation Structure

### `/docs/` (This Directory)
**Public Documentation** - Built with Docusaurus (deployment details TBD)

- **User Guides**: How to use anchorpipe
- **Integration Guides**: Setting up CI/CD integrations
- **API Reference**: Complete API documentation
- **Contributing Guides**: How to contribute to the project
- **Tutorials**: Step-by-step guides

### `/docs/internal/` (Internal Documentation)
**Internal/Planning Documentation** - For maintainers and core contributors

- **Program Documentation**: PRD, Architecture, Quality Handbook
- **ADRs**: Architecture Decision Records
- **Planning Docs**: Issue breakdowns, roadmaps
- **Bootstrap Guides**: Development setup guides

> Note: Internal docs moved from `anchorpipe_guide_docs/` for better organization.

### `/docs/adr/` (Architecture Decisions)
**Public ADRs** - Major architectural decisions visible to community

- Currently: `0001-core-backend-stack.md` through `0012-failure-details-privacy.md`
- Some ADRs may be internal (marked in ADR header)

## Documentation Site

The public documentation site is built with Docusaurus and deployed to:
- **Production**: Documentation site (coming soon)
- **Preview**: Vercel preview deployments for PRs

## Contributing to Documentation

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing.

### Documentation Types

1. **User Documentation**: Help users accomplish tasks
2. **API Documentation**: Complete API reference
3. **Integration Guides**: Step-by-step setup for CI/CD platforms
4. **Contributing Docs**: Help contributors get started

### Writing Guidelines

- Use clear, concise language
- Include code examples
- Keep up-to-date with code changes
- Follow accessibility guidelines (WCAG 2.2 AA)

## Access Levels

### Public (Anyone)
- `/docs/` - All public documentation
- `/docs/adr/` - Architecture decisions (public)
- `/LICENSE` - AGPL v3 license
- `/CONTRIBUTING.md` - Contribution guide
- `/README.md` - Project overview

### Internal (Maintainers)
- `/docs/internal/` - Planning and internal documentation
- `/docs/internal/adr/` - Internal ADRs (if any)
- `/GOVERNANCE.md` - Project governance
- `/COMMERCIAL_STRATEGY.md` - Commercial strategy

## Building Documentation Locally

```bash
# Install dependencies
npm install

# Build docs site
npm run docs:build

# Run dev server
npm run docs:dev
```

## Documentation Status

- ✅ Legal documents (LICENSE, CONTRIBUTING, etc.)
- ✅ Architecture documentation
- ⏳ User guides (to be created)
- ⏳ API documentation (to be created)
- ⏳ Integration guides (to be created)
- ⏳ Tutorials (to be created)
