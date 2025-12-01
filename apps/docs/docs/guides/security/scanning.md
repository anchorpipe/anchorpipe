---
sidebar_position: 9
sidebar_label: 'Security Scanning in CI Pipeline'
---

# Security Scanning in CI Pipeline

This document describes the security scanning setup for the Anchorpipe project, including CodeQL, Dependabot, SAST, and SCA tools.

## Overview

Anchorpipe uses multiple security scanning tools to identify and remediate vulnerabilities:

- **CodeQL**: Static analysis for JavaScript/TypeScript code
- **Dependabot**: Automated dependency updates and vulnerability alerts
- **SAST**: Static Application Security Testing (npm audit)
- **SCA**: Software Composition Analysis (Snyk)

## CodeQL Analysis

### Configuration

CodeQL is configured in `.github/workflows/codeql.yml` and runs:

- On every push to `main`
- On every pull request targeting `main`
- Weekly on Mondays at 00:00 UTC
- Manually via `workflow_dispatch`

### Features

- **Languages**: JavaScript and TypeScript
- **Queries**: Security and quality queries (`+security-and-quality`)
- **Results**: Uploaded to GitHub Security tab
- **PR Annotations**: Critical findings automatically annotated on PRs

### Viewing Results

1. Go to the **Security** tab in the repository
2. Click on **Code scanning alerts**
3. Filter by severity, language, or query

### Suppressing False Positives

To suppress a false positive:

1. Open the CodeQL alert in the Security tab
2. Click **Dismiss**
3. Select reason: **False positive** or **Used in tests**
4. Add a comment explaining why it's safe to ignore

## Dependabot

### Configuration

Dependabot is configured in `.github/dependabot.yml` and monitors:

- **npm packages** (root and all workspaces)
- **Docker images** (in `apps/web`)
- **GitHub Actions** (workflow files)

### Update Schedule

- **Frequency**: Weekly on Mondays at 09:00 UTC
- **Limit**: Maximum 10 open pull requests
- **Grouping**: Security updates are prioritized separately

### Security Updates

Security updates are automatically:

- Labeled with `dependencies` and `auto-update`
- Grouped separately from regular updates
- Prioritized for review

### Viewing Alerts

1. Go to the **Security** tab
2. Click on **Dependabot alerts**
3. Review vulnerable dependencies

### Resolving Vulnerabilities

1. **Automatic PR**: Dependabot creates a PR with the fix
2. **Manual Update**: Update the dependency in `package.json` and run `npm install`
3. **Review PR**: Test the update and merge if safe

## SAST (Static Application Security Testing)

### npm audit

The `security-scan.yml` workflow runs `npm audit` to detect:

- Known vulnerabilities in npm dependencies
- Outdated packages with security issues
- Direct and transitive dependency vulnerabilities

### Severity Levels

- **Critical**: Blocks PR merge
- **High**: Blocks PR merge
- **Moderate**: Non-blocking (warning only)
- **Low**: Non-blocking (warning only)

### Viewing Results

1. Check the **Security Scanning (SAST/SCA)** workflow run
2. View the **npm audit** job logs
3. Download the `npm-audit-results` artifact for detailed JSON

### Resolving Issues

```bash
# Fix automatically (if possible)
npm audit fix

# Review and fix manually
npm audit
npm update <package-name>

# For breaking changes, review changelog first
npm update <package-name>@<version>
```

## SCA (Software Composition Analysis)

### Snyk Integration

Snyk provides additional vulnerability scanning beyond npm audit:

- **License compliance**: Check for problematic licenses
- **Vulnerability database**: More comprehensive than npm audit
- **Remediation advice**: Specific fix recommendations

### Setup

1. Get a Snyk token from [https://app.snyk.io/account](https://app.snyk.io/account)
2. Add `SNYK_TOKEN` to repository secrets
3. The workflow will automatically use Snyk when the token is available

### Viewing Results

1. Check the **Security Scanning (SAST/SCA)** workflow run
2. View the **SCA** job logs
3. Download the `snyk-results` artifact for detailed JSON

### Resolving Issues

Snyk provides specific remediation advice:

```bash
# Install Snyk CLI locally
npm install -g snyk

# Authenticate
snyk auth

# Test and get fix advice
snyk test

# Apply fixes (if available)
snyk fix
```

## Critical Issue Blocking

### How It Works

Critical and high severity vulnerabilities **block PR merges**:

1. Security scans run automatically on every PR
2. If critical/high issues are found, the workflow fails
3. PR status shows as "failing" with a comment explaining the issue
4. PR cannot be merged until vulnerabilities are resolved

### Bypassing (Not Recommended)

**Do not bypass security checks unless absolutely necessary.**

If you must bypass (e.g., false positive that can't be suppressed):

1. Document the reason in the PR description
2. Get explicit approval from security team
3. Use GitHub's "bypass branch protection" feature (admin only)

## Reports and Archiving

### Artifact Retention

- **npm audit results**: 30 days
- **Snyk results**: 30 days
- **CodeQL results**: Stored in GitHub Security tab (permanent)

### Accessing Archived Reports

1. Go to the workflow run
2. Click on **Artifacts**
3. Download the relevant artifact (JSON format)

## Suppressing False Positives

### CodeQL

1. Open the alert in Security tab
2. Click **Dismiss**
3. Select reason and add comment

### npm audit

Add to `.npmrc`:

```
audit-level=moderate
```

Or suppress specific packages (not recommended):

```json
{
  "overrides": {
    "package-name": "^1.2.3"
  }
}
```

### Snyk

Use `.snyk` policy file:

```yaml
# .snyk
version: v1.0.0
ignore:
  SNYK-JS-PACKAGE-123456:
    - '*':
        reason: False positive - used only in tests
        expires: '2025-12-31T00:00:00.000Z'
```

## Best Practices

1. **Review Dependabot PRs promptly**
   - Security updates should be merged quickly
   - Test thoroughly before merging

2. **Don't ignore security warnings**
   - Even moderate/low severity issues should be addressed
   - Create follow-up issues if not immediately fixable

3. **Keep dependencies up to date**
   - Regular updates reduce attack surface
   - Use `npm outdated` to check for updates

4. **Monitor security alerts**
   - Subscribe to Security tab notifications
   - Review weekly security reports

5. **Document suppressions**
   - Always document why a false positive is suppressed
   - Set expiration dates for suppressions

## Troubleshooting

### Scan Not Running

**Problem**: Security scans not appearing in workflow runs

**Solutions**:

1. Check workflow file syntax (YAML validation)
2. Verify branch protection rules allow workflows
3. Check workflow permissions in repository settings

### False Positives

**Problem**: Legitimate code flagged as vulnerable

**Solutions**:

1. Suppress in CodeQL (Security tab)
2. Add to `.snyk` policy (for Snyk)
3. Document in PR if temporary suppression needed

### Slow Scans

**Problem**: Security scans taking too long

**Solutions**:

1. Reduce scope (scan only changed files)
2. Use caching for dependencies
3. Run scans in parallel jobs

### Token Issues

**Problem**: Snyk scan failing due to token

**Solutions**:

1. Verify `SNYK_TOKEN` secret is set
2. Check token hasn't expired
3. Verify token has correct permissions

## Related Documentation

- [CI/CD Pipeline Setup](https://github.com/anchorpipe/anchorpipe/blob/main/docs/guides/foundation/cicd-pipeline) - CI/CD pipeline configuration
- [Security Best Practices](https://github.com/anchorpipe/anchorpipe/blob/main/SECURITY.md) - Security policy
- [Foundation Guides](../foundation/README.md) - Foundation documentation

## Support

For security scanning issues:

- **CodeQL**: Check [GitHub CodeQL documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors)
- **Dependabot**: Check [Dependabot documentation](https://docs.github.com/en/code-security/dependabot)
- **Snyk**: Check [Snyk documentation](https://docs.snyk.io/)
- **General**: Open an issue with label `area:security`
