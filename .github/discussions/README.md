# GitHub Discussions Content

This directory contains the content files for initial GitHub Discussions that should be created for the anchorpipe project.

## Files

- `welcome-to-anchorpipe.md` - Welcome message (General category, pinned)
- `how-to-contribute.md` - Contribution guide (General category, pinned)
- `epic-0-completion-announcement.md` - Epic 0 completion announcement (Announcements category, pinned)
- `project-roadmap.md` - Project roadmap (Announcements category, pinned)
- `SETUP-GUIDE.md` - Manual setup instructions

## Setup Instructions

### Option 1: Manual Setup (Recommended for first time)

1. Follow the instructions in `SETUP-GUIDE.md`
2. Create categories via web interface
3. Create discussions manually using the content files

### Option 2: Automated Setup (After categories exist)

1. Get category IDs:
   ```bash
   gh api repos/anchorpipe/anchorpipe/discussions/categories
   ```

2. Run the script:
   ```powershell
   .\scripts\create-discussions.ps1 -CategoryGeneral <id> -CategoryAnnouncements <id>
   ```

## Category Requirements

Before creating discussions, ensure these categories exist:

1. **📢 Announcements** - For announcements and roadmap
2. **💬 General** - For welcome and contribution guides

## Notes

- Discussions can be pinned after creation
- Some discussions should be locked (read-only) after creation
- Update content files as the project evolves

