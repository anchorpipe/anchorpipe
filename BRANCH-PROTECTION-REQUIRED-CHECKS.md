# Branch Protection - Required Status Checks

## Summary

For the `main` branch, configure branch protection to require the following checks:

### Required Checks (8 checks)

1. **CI / lint** - ESLint validation
2. **CI / typecheck** - TypeScript type checking
3. **CI / build** - Build verification
4. **DCO Check / Verify DCO** - Developer Certificate of Origin
5. **CodeQL Analysis / Analyze (javascript)** - Security analysis
6. **CodeQL Analysis / Analyze (typescript)** - Security analysis
7. **PR Validation / check-linked-issue** - PR validation (optional, can be removed)
8. **PR Validation / check-pr-title** - PR title validation (optional, can be removed)

### Optional Checks (can be marked as not required)

- **PR Validation / check-large-files** - Warning only, not blocking

## Configuration

### Important Notes

- **Do NOT require checks that only run on `push` events** - Only require checks that run on `pull_request` events
- **All workflows now run on both `pull_request` and `push` events** - This ensures checks are available for branch protection
- **Wait for checks to run on PR before configuring** - Some checks (like CodeQL) only appear after they've run once

### Steps to Configure

1. Go to repository Settings → Branches → Branch protection rules → `main`
2. Under "Require status checks to pass before merging":
   - ✅ Require branches to be up to date before merging
   - Add the checks listed above (only those that have run on a PR)
3. **Do NOT add checks that haven't run yet** - They won't appear in the dropdown until they've run at least once

### Troubleshooting

If a check shows as "Expected" but hasn't run:
- The check might only be configured for `push` events
- Update the workflow to run on `pull_request` events as well
- Or remove it from required checks if it's not critical

If you see duplicate checks:
- Ensure workflow `name:` fields are unique
- Check that jobs aren't running twice (on PR and push separately)

## Current Workflow Configuration

All workflows are now configured to run on both `pull_request` and `push` events:
- ✅ `ci.yml` - Runs on PR and push
- ✅ `dco-check.yml` - Runs on PR and push
- ✅ `codeql.yml` - Runs on PR and push
- ✅ `pr-validation.yml` - Runs on PR only (intentional)

