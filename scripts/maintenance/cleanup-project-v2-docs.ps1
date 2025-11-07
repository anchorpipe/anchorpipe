# Cleanup Project V2 Setup Documentation
# Removes temporary/obsolete files from the Project V2 setup process

param(
    [switch]$DryRun = $false,
    [switch]$Archive = $true
)

Write-Host "`n=== Project V2 Documentation Cleanup ===" -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN (no files deleted)' } else { 'DELETE FILES' })" -ForegroundColor Yellow
Write-Host ""

# Files to KEEP (essential documentation)
$keepFiles = @(
    'PROJECT-V2-FINAL-COMPLETION.md',
    'ORGANIZATION-SECRETS-SETUP.md',
    'PARENT-CHILD-ISSUE-MAPPING.md',
    'PARENT-CHILD-ISSUE-MAPPING.csv',
    'MISSING-FIELDS-BY-VIEW.md',
    'BURN-UP-CHART-VERIFICATION.md',
    # View setup guides
    'VIEW-2-ROADMAP-DETAILED-SETUP.md',
    'VIEW-2-ROADMAP-QUICK-REFERENCE.md',
    'VIEW-3-SPRINT-BOARD-DETAILED-SETUP.md',
    'VIEW-3-SPRINT-BOARD-QUICK-REFERENCE.md',
    'VIEW-4-BACKLOG-DETAILED-SETUP.md',
    'VIEW-4-BACKLOG-QUICK-REFERENCE.md',
    'VIEW-5-BUG-TRIAGE-DETAILED-SETUP.md',
    'VIEW-5-BUG-TRIAGE-QUICK-REFERENCE.md',
    'VIEW-6-CONTRIBUTOR-ISSUES-DETAILED-SETUP.md',
    'VIEW-6-CONTRIBUTOR-ISSUES-QUICK-REFERENCE.md',
    'VIEW-7-PERFORMANCE-SECURITY-DETAILED-SETUP.md',
    'VIEW-7-PERFORMANCE-SECURITY-QUICK-REFERENCE.md',
    'VIEW-8-BURN-UP-CHART-DETAILED-SETUP.md'
)

# Files to DELETE (temporary/redundant documentation)
$deleteFiles = @(
    # Temporary guides
    'ADD-FIELDS-TO-BUG-TRIAGE-GUIDE.md',
    'BUG-TRIAGE-FIELDS-READY.md',
    'CREATE-ALL-VIEWS-NOW.md',
    'ISSUE-74-GATE-UPDATE.md',
    'ISSUE-NUMBER-SORTING-SOLUTION.md',
    'LABEL-ANALYSIS-SUMMARY.md',
    'LINK-ISSUES-TO-EPICS-MANUAL-GUIDE.md',
    'QUICK-LINK-REMAINING-EPICS.md',
    'STATUS-AND-DATE-FIELDS-GUIDE.md',
    'STATUS-FIELD-POPULATION-COMPLETE.md',
    'STATUS-LABELS-UPDATE-SUMMARY.md',
    # Epic/sub-issue docs (resolved)
    'EPIC-SUB-ISSUE-COMPLETE-ANSWER.md',
    'EPIC-SUB-ISSUE-STATUS-SOLUTION.md',
    'EPIC-SUB-ISSUE-STATUS-STRATEGY.md',
    'PARENT-ISSUE-API-LIMITATION.md',
    'POPULATE-STATUS-FIELD-FROM-LABELS.md',
    # Multiple status files
    'PROJECT-V2-ACTION-REQUIRED.md',
    'PROJECT-V2-COMPLETE-MAPPING-TABLE.md',
    'PROJECT-V2-COMPLETE-STATUS.md',
    'PROJECT-V2-COMPLETION-SUMMARY.md',
    'PROJECT-V2-CREATE-REMAINING-VIEWS.md',
    'PROJECT-V2-CURRENT-STATUS.md',
    'PROJECT-V2-EPIC-MAPPING-TABLE.md',
    'PROJECT-V2-FIELD-ADDITION-GUIDE.md',
    'PROJECT-V2-FIELDS-COMPLETE.md',
    'PROJECT-V2-FINAL-CHECKLIST.md',
    'PROJECT-V2-FINAL-STATUS.md',
    'PROJECT-V2-NEXT-STEPS.md',
    'PROJECT-V2-PROBLEMS-SOLUTIONS.md',
    'PROJECT-V2-QUICK-FIX-SUMMARY.md',
    'PROJECT-V2-QUICK-POPULATION-GUIDE.md',
    'PROJECT-V2-SETUP-COMPLETE.md',
    'PROJECT-V2-SETUP-FINAL-SUMMARY.md',
    'PROJECT-V2-SETUP-STATUS.md',
    'PROJECT-V2-SORTING-GUIDE.md',
    # View-specific troubleshooting
    'PROJECT-V2-VIEW-3-ANALYSIS.md',
    'PROJECT-V2-VIEW-3-CHECK.md',
    'PROJECT-V2-VIEW-3-SUMMARY.md',
    'PROJECT-V2-VIEWS-AUTOMATION-NOTE.md',
    'PROJECT-V2-VIEWS-CREATION-QUICK-START.md',
    'PROJECT-V2-VIEWS-SETUP-GUIDE.md',
    'PROJECT-V2-VIEWS-TROUBLESHOOTING.md',
    'VIEW-2-ROADMAP-FINAL-SETUP.md',
    'VIEW-3-SPRINT-BOARD-AUTOMATED-CHECKS.md',
    'VIEW-3-SPRINT-BOARD-MANUAL-STEPS.md',
    # Sprint board hierarchical (resolved)
    'SPRINT-BOARD-HIERARCHICAL-DESIGN.md',
    'SPRINT-BOARD-HIERARCHICAL-FINAL.md',
    'SPRINT-BOARD-HIERARCHICAL-SETUP.md'
)

$deletedCount = 0
$notFoundCount = 0

Write-Host "Files to KEEP: $($keepFiles.Count)" -ForegroundColor Green
Write-Host "Files to DELETE: $($deleteFiles.Count)" -ForegroundColor Red
Write-Host ""

if ($DryRun) {
    Write-Host "=== DRY RUN - Files that would be deleted ===" -ForegroundColor Yellow
    Write-Host ""
    foreach ($file in $deleteFiles) {
        if (Test-Path $file) {
            $size = (Get-Item $file).Length
            Write-Host "  Would delete: $file ($size bytes)" -ForegroundColor Gray
        } else {
            Write-Host "  Not found: $file" -ForegroundColor DarkGray
            $notFoundCount++
        }
    }
    Write-Host ""
    Write-Host "To actually delete these files, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\cleanup-project-v2-docs.ps1" -ForegroundColor White
} else {
    Write-Host "=== Deleting Files ===" -ForegroundColor Red
    Write-Host ""
    foreach ($file in $deleteFiles) {
        if (Test-Path $file) {
            try {
                Remove-Item $file -Force
                Write-Host "  ✓ Deleted: $file" -ForegroundColor Green
                $deletedCount++
            } catch {
                Write-Host "  ✗ Error deleting $file : $_" -ForegroundColor Red
            }
        } else {
            $notFoundCount++
        }
    }
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "  Deleted: $deletedCount files" -ForegroundColor Green
    Write-Host "  Not found: $notFoundCount files" -ForegroundColor Yellow
    Write-Host "  Kept: $($keepFiles.Count) essential files" -ForegroundColor Green
}

Write-Host ""
