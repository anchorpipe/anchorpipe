# Branch Protection Setup Guide

This guide documents the branch protection rules that need to be configured for the `main` branch to align with our development practices and security requirements.

## Overview

Based on our documentation:

- **09-release-ops.md**: "trunk-based on main; short-lived feature branches; rebase/linear history; protected main"
- **08-quality-handbook.md**: "Two-person review for security-sensitive areas; CODEOWNERS approvals required"
- **06-compliance.md**: "branch protections" as part of SDLC security

## Required Branch Protection Rules

Configure these rules in: **GitHub Repository Settings → Branches → Branch protection rules → Add rule**

### Branch Name Pattern

- **Pattern**: `main`

### Settings to Enable

#### 1. ✅ Require a pull request before merging

- **Required approvals**: `1` (minimum)
- **Require review from Code Owners**: ✅ **Enabled**
  - This ensures CODEOWNERS file is respected
  - When enabled, PRs that modify files owned by specific paths require approval from those owners
- **Dismiss stale pull request approvals when new commits are pushed**: ✅ **Enabled**
- **Require review from CODEOWNERS if the CODEOWNERS file has been changed**: ✅ **Enabled**
- **Require last pusher to be a different person than the last reviewer**: ✅ **Enabled** (if team grows)

#### 2. ✅ Require status checks to pass before merging

- **Required status checks** (select these):
  - `CI / lint` ✅
  - `CI / typecheck` ✅
  - `CI / build` ✅
  - `CodeQL Analysis / Analyze (javascript)` ✅
  - `CodeQL Analysis / Analyze (typescript)` ✅
  - `DCO Check / Verify DCO` ✅
  - `PR Validation / Validate PR` ✅ (optional, can be warning)
- **Require branches to be up to date before merging**: ✅ **Enabled**
- **Strict status checks**: ✅ **Enabled**

#### 3. ✅ Require conversation resolution before merging

- **Enabled**: ✅
  - Ensures all PR review comments are addressed

#### 4. ✅ Require signed commits

- **Enabled**: ✅
  - Works in conjunction with DCO check
  - Note: Our DCO check workflow already validates sign-off, but this provides additional protection

#### 5. ✅ Require linear history

- **Enabled**: ✅
  - Enforces rebase/linear history (no merge commits)
  - Aligns with "rebase/linear history" requirement in 09-release-ops.md

#### 6. ✅ Include administrators

- **Enabled**: ✅
  - Applies rules to repository admins as well

#### 7. ⚠️ Do NOT allow force pushes

- **Enabled**: ✅ (block force pushes)
  - Protects branch integrity

#### 8. ⚠️ Do NOT allow deletions

- **Enabled**: ✅ (block deletions)
  - Prevents accidental branch deletion

## Optional Settings

### Allow specified actors to bypass required pull requests

- Leave **disabled** unless you have specific automation needs

### Lock branch

- Leave **disabled** unless dealing with security incidents

## Workflow Status Checks Required

After workflows are created and run, add these to the required status checks list:

### Critical (Must Pass)

1. **CI / lint** - ESLint and formatting checks
2. **CI / typecheck** - TypeScript compilation
3. **CI / build** - Application build
4. **DCO Check / Verify DCO** - Developer Certificate of Origin
5. **CodeQL Analysis / Analyze** - Security scanning

### Optional (Warning Only)

6. **PR Validation / Validate PR** - PR requirement checks (can be warning)

### Future (When Tests Are Added)

- **CI / test-unit** - Unit tests
- **CI / test-integration** - Integration tests

## Setting Up Branch Protection

### Via GitHub Web UI

1. Navigate to: `https://github.com/anchorpipe/anchorpipe/settings/branches`
2. Click **Add rule** or edit existing rule for `main`
3. Configure all settings as listed above
4. Click **Create** or **Save changes**

### Via GitHub CLI (Alternative)

```bash
gh api repos/anchorpipe/anchorpipe/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]='CI / lint' \
  --field required_status_checks[contexts][]='CI / typecheck' \
  --field required_status_checks[contexts][]='CI / build' \
  --field required_status_checks[contexts][]='DCO Check / Verify DCO' \
  --field required_status_checks[contexts][]='CodeQL Analysis / Analyze (javascript)' \
  --field required_status_checks[contexts][]='CodeQL Analysis / Analyze (typescript)' \
  --field enforce_admins=true \
  --field required_pull_request_reviews[dismissal_restrictions][users][]=rick1330 \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=true \
  --field required_pull_request_reviews[require_last_push_approval]=false \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field required_conversation_resolution=true \
  --field require_signed_commits=true
```

**Note**: You'll need to adjust the contexts array after the first CI run to get the exact workflow run names.

## Verification

After setting up branch protection:

1. Create a test branch and PR to verify:
   - PR cannot be merged without approvals
   - PR cannot be merged if CI fails
   - PR requires CODEOWNERS approval if relevant files are changed
   - Direct pushes to `main` are blocked

2. Test CODEOWNERS enforcement:
   - Create a PR modifying a file covered by CODEOWNERS
   - Verify that @rick1330 (or specified owners) are automatically requested for review

## Related Files

- `.github/CODEOWNERS` - Code ownership definitions
- `.github/workflows/ci.yml` - CI workflow with status checks
- `.github/workflows/dco-check.yml` - DCO verification
- `.github/workflows/codeql.yml` - Security scanning
- `.github/workflows/pr-validation.yml` - PR requirement validation

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [CODEOWNERS Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- **Internal Docs**:
  - `anchorpipe_guide_docs/docs/09-release-ops.md` - Branching strategy
  - `anchorpipe_guide_docs/docs/08-quality-handbook.md` - Code review requirements
  - `anchorpipe_guide_docs/docs/06-compliance.md` - SDLC security requirements

## Notes

- Branch protection rules are enforced immediately after creation
- Existing PRs may need to be updated to meet new requirements
- Workflow status check names must match exactly (case-sensitive)
- CODEOWNERS changes themselves require CODEOWNERS approval (when enabled)
