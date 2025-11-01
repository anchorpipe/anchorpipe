# GitHub Project V2 Setup - Current Status

> **Project Board**: https://github.com/orgs/anchorpipe/projects/3  
> **Project Number**: 3  
> **Status**: ✅ Infrastructure Ready | ⚠️ Manual Steps Required

---

## ✅ Completed (Automated)

### Infrastructure
- ✅ Created `.github/workflows/` directory
- ✅ Created 4 automation workflows:
  - `add-to-project-v2.yml` - Auto-adds new issues/PRs
  - `sync-status-to-project.yml` - Syncs status labels
  - `auto-close-done.yml` - Auto-closes done issues
  - `triage-issues.yml` - Auto-labels new issues
- ✅ Created 3 PowerShell scripts:
  - `setup-project-v2.ps1` - Master setup script
  - `add-issues-to-project-v2.ps1` - Bulk add issues
  - `add-issues-to-project-simple.ps1` - Simplified guide script
- ✅ Created comprehensive documentation
- ✅ Verified repository has 94 issues

### Repository Status
- **Repository**: anchorpipe/anchorpipe
- **Issues**: 94 issues found
- **Project Board**: Created at https://github.com/orgs/anchorpipe/projects/3
- **GitHub CLI**: Authenticated

---

## ⚠️ Manual Steps Required

### Step 1: Add All Issues to Project (2 minutes)

**Option A: GitHub UI Bulk Import (Recommended - Fastest)**

1. Go to: https://github.com/orgs/anchorpipe/projects/3
2. Click **"Add item"** → **"Import from issues"**
3. Select repository: `anchorpipe/anchorpipe`
4. Select all 94 issues (or filter by labels if desired)
5. Click **"Add items"**

**Done!** All issues are now in the project.

**See**: `scripts/bulk-add-issues-guide.md` for detailed instructions

---

### Step 2: Configure Views (30 minutes)

Create these 7 views in your project:

1. **🗺️ Roadmap** (Table View)
   - Group by: `gate` (G0, GA, GB, GC, GD)
   - Sort by: `gate` → `priority`

2. **🚦 Sprint Board** (Board/Kanban View)
   - Columns: Triage, To Do, In Progress, Blocked, Done
   - Group by: Status labels
   - Set WIP limits: 5, 10, 5, 3 respectively

3. **🎯 Backlog** (Table View)
   - Group by: `gate`
   - Sort by: `priority` (descending)

4. **🐞 Bug Triage** (Table View)
   - Filter: `type:bug`
   - Sort by: `priority` → `created` (newest)

5. **👥 Contributor Issues** (Table View)
   - Filter: `good first issue` OR `help wanted`
   - Sort by: `created` → `priority`

6. **🧪 Performance & Security** (Table View)
   - Filter: `performance` OR `security`
   - Sort by: `priority` → `updated`

7. **📊 Burn-Up Data** (Table View)
   - Group by: `milestone` or `gate`
   - Include: Status, Points, Created, Closed dates

**Quick Reference**: See `tempo-local/anchorpipe_guide_docs/PROJECT-V2-QUICK-START.md` for view configurations

---

### Step 3: Create Custom Fields (15 minutes)

Create these 5 custom fields in your project:

1. **Epic** (Single Select)
   - Options: EPIC-000, EPIC-00A, EPIC-001, EPIC-002, EPIC-003, EPIC-004, EPIC-005, EPIC-006, EPIC-007

2. **Story Points** (Number)
   - Default: 0
   - Mapping: XS=0.5, S=1, M=2, L=3, XL=5

3. **Severity** (Single Select)
   - Options: 🔴 Critical, 🟠 High, 🟡 Medium, 🟢 Low

4. **Blocked Reason** (Text)
   - Free text field for blocker details

5. **Contributor Friendly** (Boolean)
   - Checkbox for community issues

**Quick Reference**: See `tempo-local/anchorpipe_guide_docs/PROJECT-V2-IMPLEMENTATION-GUIDE.md` Phase 3

---

### Step 4: Configure Workflow Secret (Optional - 2 minutes)

For automatic addition of **future** issues:

1. Go to: https://github.com/anchorpipe/anchorpipe/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `PROJECT_V2_URL`
4. **Value**: `https://github.com/orgs/anchorpipe/projects/3`
5. Click **"Add secret"**

This ensures new issues are automatically added to the project.

---

## 📋 Quick Actions Checklist

- [ ] Add all 94 issues to project (GitHub UI - see Step 1)
- [ ] Create 7 views (see Step 2)
- [ ] Create 5 custom fields (see Step 3)
- [ ] Populate Epic field for issues (link to parent epic)
- [ ] Set Story Points from size labels (S=1, M=2, L=3)
- [ ] Configure workflow secret (optional - see Step 4)
- [ ] Test automation by creating a test issue
- [ ] Verify all views work correctly

---

## 🚀 Next Steps After Setup

1. **Daily Use**:
   - Use Sprint Board view for standups
   - Use Roadmap view for planning
   - Update status labels as work progresses

2. **Weekly**:
   - Review backlog prioritization
   - Update epic progress
   - Check for blocked items

3. **Monthly**:
   - Review project metrics
   - Update views/fields as needed
   - Gather team feedback

---

## 📚 Documentation Reference

- **Quick Start**: `tempo-local/anchorpipe_guide_docs/PROJECT-V2-QUICK-START.md`
- **Full Implementation Guide**: `tempo-local/anchorpipe_guide_docs/PROJECT-V2-IMPLEMENTATION-GUIDE.md`
- **Bulk Add Guide**: `scripts/bulk-add-issues-guide.md`
- **Original Specification**: `tempo-local/anchorpipe_guide_docs/project-v2-to-create.md`

---

## ✅ Verification

After completing manual steps, verify:

- [ ] All 94 issues appear in project board
- [ ] All 7 views are created and working
- [ ] All 5 custom fields are created
- [ ] Epic field populated for issues with parent epics
- [ ] Automation workflows are active (check Actions tab)
- [ ] New issues automatically appear in project (test by creating one)

---

**Current Status**: Infrastructure ready, awaiting manual project board configuration

**Estimated Time for Manual Steps**: ~1 hour total

**Project URL**: https://github.com/orgs/anchorpipe/projects/3
