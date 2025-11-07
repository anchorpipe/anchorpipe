# Archive one-time setup scripts to tempo-local/used-scripts/
# Keeps utility scripts in scripts/ directory

param(
    [switch]$DryRun = $false
)

Write-Host "`n=== Archive Setup Scripts ===" -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN' } else { 'MOVE FILES' })" -ForegroundColor Yellow
Write-Host ""

# Utility scripts to KEEP in scripts/
$keepScripts = @(
    'labels-sync.ps1',           # Ongoing utility for syncing labels
    'cleanup-project-v2-docs.ps1', # May be useful again
    'analyze-labels.ps1'          # Useful for label management
)

# One-time setup scripts to ARCHIVE
$archiveScripts = @(
    # Issue addition scripts (done)
    'add-issues-now.ps1',
    'add-issues-to-project-board.ps1',
    'add-issues-to-project-simple.ps1',
    'add-issues-to-project-v2.ps1',
    'add-size-labels-to-issues.ps1',
    
    # Field creation scripts (done)
    'create-and-populate-area-field.ps1',
    'create-and-populate-gate-field.ps1',
    'create-and-populate-issue-number-field.ps1',
    'create-and-populate-priority-field.ps1',
    'create-and-populate-type-field.ps1',
    'create-date-fields-for-project.ps1',
    'create-fields-remaining.ps1',
    'create-project-v2-views-and-fields.ps1',
    'create-project-v2-views.ps1',
    'create-status-field.ps1',
    
    # Population scripts (done)
    'populate-date-fields.ps1',
    'populate-project-fields.ps1',
    'populate-status-field-from-labels.ps1',
    'populate-story-points-from-size-labels.ps1',
    
    # Update scripts (done)
    'update-issue-type-field-with-all-types.ps1',
    'update-status-labels-for-all-issues.ps1',
    
    # Mapping/linking scripts (done)
    'link-stories-to-epics-by-labels.ps1',
    'link-stories-to-epics-v2.ps1',
    'link-stories-to-epics.ps1',
    'map-parent-to-child-issues-simple.ps1',
    'map-parent-to-child-issues.ps1',
    
    # Generation scripts (done)
    'generate-accurate-mapping-table.ps1',
    'generate-epic-mapping-table.ps1',
    
    # Setup scripts (done)
    'setup-project-v2.ps1',
    'remove-closed-issues-from-project.ps1',
    
    # Documentation
    'bulk-add-issues-guide.md'
)

# Create archive directory
$archiveDir = "tempo-local/used-scripts"
if (-not (Test-Path $archiveDir)) {
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
        Write-Host "  ✓ Created directory: $archiveDir" -ForegroundColor Green
    } else {
        Write-Host "  Would create directory: $archiveDir" -ForegroundColor Gray
    }
}

Write-Host "`nScripts to KEEP in scripts/: $($keepScripts.Count)" -ForegroundColor Green
$keepScripts | ForEach-Object { Write-Host "  ✓ $_" -ForegroundColor Gray }

Write-Host "`nScripts to ARCHIVE to $archiveDir/: $($archiveScripts.Count)" -ForegroundColor Yellow

$movedCount = 0
$notFoundCount = 0
$projectSetupDir = "scripts/project-setup"

if ($DryRun) {
    Write-Host "`n=== DRY RUN - Files that would be moved ===" -ForegroundColor Yellow
    Write-Host ""
    foreach ($script in $archiveScripts) {
        $sourcePath = "scripts/$script"
        if (Test-Path $sourcePath) {
            Write-Host "  Would move: $script" -ForegroundColor Gray
        } else {
            Write-Host "  Not found: $script" -ForegroundColor DarkGray
            $notFoundCount++
        }
    }
    
    # Check project-setup directory
    if (Test-Path $projectSetupDir) {
        Write-Host "`n  Would move directory: project-setup/" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "To actually move these files, run:" -ForegroundColor Cyan
    Write-Host "  .\scripts\archive-setup-scripts.ps1" -ForegroundColor White
} else {
    Write-Host "`n=== Moving Files ===" -ForegroundColor Red
    Write-Host ""
    
    foreach ($script in $archiveScripts) {
        $sourcePath = "scripts/$script"
        $destPath = "$archiveDir/$script"
        
        if (Test-Path $sourcePath) {
            try {
                Move-Item $sourcePath $destPath -Force
                Write-Host "  ✓ Moved: $script" -ForegroundColor Green
                $movedCount++
            } catch {
                Write-Host "  ✗ Error moving $script : $_" -ForegroundColor Red
            }
        } else {
            $notFoundCount++
        }
    }
    
    # Move project-setup directory if it exists
    if (Test-Path $projectSetupDir) {
        try {
            Move-Item $projectSetupDir "$archiveDir/project-setup" -Force
            Write-Host "  ✓ Moved directory: project-setup/" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Error moving project-setup/ : $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "  Moved: $movedCount files" -ForegroundColor Green
    Write-Host "  Not found: $notFoundCount files" -ForegroundColor Yellow
    Write-Host "  Kept in scripts/: $($keepScripts.Count) utility scripts" -ForegroundColor Green
    Write-Host ""
    Write-Host "Archive location: $archiveDir/" -ForegroundColor Cyan
}

Write-Host ""
