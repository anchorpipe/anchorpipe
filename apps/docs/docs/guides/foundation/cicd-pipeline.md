# CI/CD Pipeline (ST-103)

## Overview

Implements automated CI/CD pipelines using GitHub Actions for testing, building, and deploying the application. Includes linting, type checking, building, testing, and security scanning.

## Workflows

### CI Workflow

Location: `.github/workflows/ci.yml`

Runs on:

- Pull requests (opened, synchronized, reopened)
- Pushes to `main` branch
- Manual trigger (`workflow_dispatch`)

**Jobs:**

1. **Lint**
   - Runs ESLint on `apps/web`
   - Checks Prettier formatting
   - Fails on errors

2. **Typecheck**
   - Runs TypeScript compiler
   - Type checks all code
   - Fails on type errors

3. **Build**
   - Builds all projects
   - Verifies build succeeds
   - Fails on build errors

4. **Test**
   - Runs unit and integration tests
   - Uses Vitest test runner
   - Fails on test failures

5. **Database Health**
   - Checks database connectivity
   - Verifies migrations can run
   - Fails on connection errors

6. **OpenAPI Validation**
   - Validates OpenAPI specification
   - Checks API documentation
   - Fails on validation errors

### Security Scanning

Location: `.github/workflows/security-scan.yml`

**Jobs:**

1. **SAST (npm audit)**
   - Scans npm dependencies
   - Detects known vulnerabilities
   - Blocks PRs with critical/high issues

2. **SCA (Snyk)**
   - Additional vulnerability scanning
   - License compliance checks
   - Optional (requires SNYK_TOKEN)

### CodeQL Analysis

Location: `.github/workflows/codeql.yml`

- Static analysis for JavaScript/TypeScript
- Security and quality queries
- Annotates PRs with critical findings
- Uploads results to Security tab

## Required Checks

All checks must pass before PR merge:

- ✅ Lint
- ✅ Typecheck
- ✅ Build
- ✅ Test
- ✅ Database Health
- ✅ OpenAPI Validation
- ✅ DCO (Developer Certificate of Origin)
- ✅ CodeQL
- ✅ Link Check

## Dependencies

### Dependabot

Location: `.github/dependabot.yml`

- Monitors npm packages
- Monitors Docker images
- Monitors GitHub Actions
- Creates PRs for updates
- Prioritizes security updates

## Local Testing

### Run CI Checks Locally

```bash
# Lint
npm run lint

# Typecheck
npx tsc --noEmit

# Build
npm run build

# Test
npm run test

# Format check
npx prettier --check .
```

### Pre-commit Hooks (Optional)

Install Husky for pre-commit checks:

```bash
npm install --save-dev husky
npx husky init
```

## Deployment

### Staging

- Automatic deployment on merge to `main`
- Vercel for web app
- Render for services (future)

### Production

- Manual deployment via GitHub Actions
- Requires approval
- Tagged releases

## Secrets

Required GitHub Secrets:

- `DATABASE_URL` - Production database
- `SNYK_TOKEN` - Snyk API token (optional)
- `VERCEL_TOKEN` - Vercel deployment token
- `DOCKER_HUB_TOKEN` - Docker Hub credentials

## Related Documentation

- [Security Scanning](../security/scanning.md) - Security workflows
- [Project Setup](project-setup.md) - Local development
- [Contributing Guide](https://github.com/anchorpipe/anchorpipe/blob/main/CONTRIBUTING.md) - Contribution process
