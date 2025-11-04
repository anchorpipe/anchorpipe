# PowerShell script to create GitHub Discussions via API
# Note: Categories must be created manually via web interface first
# This script creates the discussion topics

param(
    [string]$CategoryGeneral = "",
    [string]$CategoryAnnouncements = "",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Creating GitHub Discussions for anchorpipe" -ForegroundColor Cyan
Write-Host ""

# Check if categories are provided
if (-not $CategoryGeneral -or -not $CategoryAnnouncements) {
    Write-Host "⚠️  Categories not provided. Please get category IDs first:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://github.com/anchorpipe/anchorpipe/discussions"
    Write-Host "   2. Inspect the page to find category IDs"
    Write-Host "   3. Or create categories manually via web interface"
    Write-Host ""
    Write-Host "To get category IDs, you can use:" -ForegroundColor Cyan
    Write-Host '   gh api repos/anchorpipe/anchorpipe/discussions/categories'
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Cyan
    Write-Host "   .\create-discussions.ps1 -CategoryGeneral <id> -CategoryAnnouncements <id>"
    Write-Host ""
    exit 1
}

# Base directory for discussion content
$discussionsDir = Join-Path $PSScriptRoot ".." ".github" "discussions"

if (-not (Test-Path $discussionsDir)) {
    Write-Host "❌ Discussions directory not found: $discussionsDir" -ForegroundColor Red
    exit 1
}

function Create-Discussion {
    param(
        [string]$CategoryId,
        [string]$Title,
        [string]$BodyFile,
        [bool]$Pin = $false
    )

    $bodyPath = Join-Path $discussionsDir $BodyFile
    
    if (-not (Test-Path $bodyPath)) {
        Write-Host "❌ File not found: $bodyPath" -ForegroundColor Red
        return $null
    }

    $body = Get-Content $bodyPath -Raw

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create: $Title" -ForegroundColor Gray
        return $null
    }

    try {
        $payload = @{
            category_id = $CategoryId
            title = $Title
            body = $body
        } | ConvertTo-Json -Depth 10

        $result = gh api repos/anchorpipe/anchorpipe/discussions -X POST --input - <<< $payload 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $discussion = $result | ConvertFrom-Json
            Write-Host "  ✅ Created: $Title" -ForegroundColor Green
            Write-Host "     URL: $($discussion.html_url)" -ForegroundColor Gray
            
            if ($Pin) {
                Write-Host "     📌 Pinning..." -ForegroundColor Yellow
                gh api repos/anchorpipe/anchorpipe/discussions/$($discussion.number) -X PATCH --input - <<< (@{pinned = $true} | ConvertTo-Json) 2>&1 | Out-Null
            }
            
            return $discussion
        } else {
            Write-Host "  ❌ Failed to create: $Title" -ForegroundColor Red
            Write-Host "     Error: $result" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "  ❌ Error creating discussion: $_" -ForegroundColor Red
        return $null
    }
}

Write-Host "Creating discussions..." -ForegroundColor Cyan
Write-Host ""

# 1. Welcome to anchorpipe! (General)
Create-Discussion -CategoryId $CategoryGeneral -Title "👋 Welcome to anchorpipe Discussions!" -BodyFile "welcome-to-anchorpipe.md" -Pin $true

# 2. How to Contribute (General)
Create-Discussion -CategoryId $CategoryGeneral -Title "🛠️ How to Contribute to anchorpipe" -BodyFile "how-to-contribute.md" -Pin $true

# 3. Epic 0 Completion Announcement (Announcements)
Create-Discussion -CategoryId $CategoryAnnouncements -Title "🎉 Epic 0 (G0 Foundation) - COMPLETE!" -BodyFile "epic-0-completion-announcement.md" -Pin $true

# 4. Project Roadmap (Announcements)
Create-Discussion -CategoryId $CategoryAnnouncements -Title "🗺️ anchorpipe Project Roadmap" -BodyFile "project-roadmap.md" -Pin $true

Write-Host ""
Write-Host "✅ Done! All discussions created." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify discussions in: https://github.com/anchorpipe/anchorpipe/discussions"
Write-Host "  2. Check that pinned discussions are visible"
Write-Host "  3. Update README if needed"

