# Scripts

Automation and operational tooling for anchorpipe. Scripts are grouped by domain to keep maintenance simple and to align with the repository structure guide.

```
scripts/
├── github/            # GitHub automation + repository hygiene
├── maintenance/       # One-off cleanup and project maintenance utilities
├── rbac/              # RBAC API test harness and setup helpers
└── README.md
```

## Directory Overview

### `github/`

- `analyze-labels.ps1` — Audits GitHub labels and usage statistics.
- `labels-sync.ps1` — Synchronizes labels from `.github/labels.yml` to the hosted repo.

### `maintenance/`

- `archive-setup-scripts.ps1` — Moves legacy Project V2 setup scripts into the archive folder.
- `cleanup-project-v2-docs.ps1` — Removes temporary documentation created during the Project V2 bootstrapping phase.

### `rbac/`

- `setup-rbac-test.js` / `setup-rbac-test.ps1` — Bootstraps test data (users, repos, roles) for RBAC scenarios.
- `test-rbac-api.sh` / `test-rbac-api.ps1` — Exercise RBAC endpoints for regression checks.
- `RBAC-TESTING-GUIDE.md` — Manual testing playbook describing the full flow.

## Usage

- PowerShell: `pwsh -File scripts/<subdir>/<script>.ps1`
- Bash: `bash scripts/<subdir>/<script>.sh`
- Node: `node scripts/<subdir>/<script>.js`

Scripts are expected to be idempotent where possible and include inline comments describing parameters. Cross-platform equivalents are provided when practical (e.g., PowerShell and Bash versions for RBAC tests).

## Adding a New Script

1. Choose or create the appropriate subdirectory (prefer reusing an existing domain).
2. Use `kebab-case` for filenames (e.g., `sync-metrics.sh`).
3. Include a short header comment describing purpose and arguments.
4. Update this README with the new script and instructions.

Archived one-off setup helpers remain in `tempo-local/used-scripts/` for historical reference.
