# Scripts Directory

This directory contains utility scripts for ongoing project management.

## Available Scripts

### Utility Scripts (Active)

- **`labels-sync.ps1`** - Sync labels from `.github/labels.yml` to GitHub repository
  - Usage: `.\scripts\labels-sync.ps1`
  - Keeps repository labels in sync with source of truth

- **`analyze-labels.ps1`** - Analyze existing labels and their usage
  - Usage: `.\scripts\analyze-labels.ps1`
  - Useful for understanding label usage patterns

- **`cleanup-project-v2-docs.ps1`** - Clean up temporary Project V2 documentation
  - Usage: `.\scripts\cleanup-project-v2-docs.ps1`
  - Removes obsolete setup documentation files

## Archived Scripts

One-time setup scripts have been moved to `tempo-local/used-scripts/` for reference:

- Issue addition scripts
- Field creation and population scripts
- Mapping and linking scripts
- Setup and configuration scripts

These scripts were used during the Project V2 setup phase and are no longer needed for daily operations.

## Usage

To run a script:

```powershell
.\scripts\<script-name>.ps1
```

Most scripts accept parameters. Check the script's help or source code for details.

---

**Note**: If you need to reference the archived setup scripts, they are available in `tempo-local/used-scripts/`.
