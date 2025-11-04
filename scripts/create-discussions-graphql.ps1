# PowerShell script to create GitHub Discussions via GraphQL API
# This script creates discussions after categories are created

$ErrorActionPreference = "Stop"

Write-Host "🚀 Creating GitHub Discussions for anchorpipe" -ForegroundColor Cyan
Write-Host ""

# Get repository ID and categories
Write-Host "📋 Fetching repository information..." -ForegroundColor Yellow

$query = @"
query {
  repository(owner: "anchorpipe", name: "anchorpipe") {
    id
    name
    discussionCategories(first: 10) {
      nodes {
        id
        name
        slug
      }
    }
  }
}
"@

$result = gh api graphql -f query=$query --jq '.data.repository' | ConvertFrom-Json

if (-not $result) {
    Write-Host "❌ Failed to fetch repository information" -ForegroundColor Red
    exit 1
}

$repoId = $result.id
$categories = $result.discussionCategories.nodes

Write-Host "✅ Repository ID: $repoId" -ForegroundColor Green
Write-Host "📂 Found $($categories.Count) categories" -ForegroundColor Green
Write-Host ""

# Find categories
$categoryGeneral = $categories | Where-Object { $_.slug -eq "general" -or $_.name -like "*General*" } | Select-Object -First 1
$categoryAnnouncements = $categories | Where-Object { $_.slug -eq "announcements" -or $_.name -like "*Announcement*" } | Select-Object -First 1

if (-not $categoryGeneral) {
    Write-Host "⚠️  General category not found. Available categories:" -ForegroundColor Yellow
    $categories | ForEach-Object { Write-Host "   - $($_.name) (slug: $($_.slug))" }
    Write-Host ""
    Write-Host "Please create the General category first via web interface" -ForegroundColor Yellow
    exit 1
}

if (-not $categoryAnnouncements) {
    Write-Host "⚠️  Announcements category not found. Available categories:" -ForegroundColor Yellow
    $categories | ForEach-Object { Write-Host "   - $($_.name) (slug: $($_.slug))" }
    Write-Host ""
    Write-Host "Please create the Announcements category first via web interface" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found General category: $($categoryGeneral.name) (ID: $($categoryGeneral.id))" -ForegroundColor Green
Write-Host "✅ Found Announcements category: $($categoryAnnouncements.name) (ID: $($categoryAnnouncements.id))" -ForegroundColor Green
Write-Host ""

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
        [string]$RepositoryId
    )

    $bodyPath = Join-Path $discussionsDir $BodyFile
    
    if (-not (Test-Path $bodyPath)) {
        Write-Host "  ❌ File not found: $bodyPath" -ForegroundColor Red
        return $null
    }

    $body = Get-Content $bodyPath -Raw

    # Escape special characters for GraphQL
    $body = $body -replace '\\', '\\\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''

    $mutation = @"
mutation {
  createDiscussion(input: {
    repositoryId: "$RepositoryId"
    categoryId: "$CategoryId"
    title: "$Title"
    body: "$body"
  }) {
    discussion {
      id
      number
      url
      title
    }
  }
}
"@

    try {
        Write-Host "  📝 Creating: $Title..." -ForegroundColor Yellow
        
        $result = gh api graphql -f query=$mutation --jq '.data.createDiscussion.discussion' | ConvertFrom-Json
        
        if ($result) {
            Write-Host "  ✅ Created: $Title" -ForegroundColor Green
            Write-Host "     URL: $($result.url)" -ForegroundColor Gray
            Write-Host "     Number: $($result.number)" -ForegroundColor Gray
            return $result
        } else {
            Write-Host "  ❌ Failed to create discussion" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        return $null
    }
}

function Pin-Discussion {
    param(
        [string]$DiscussionId
    )

    $mutation = @"
mutation {
  pinDiscussion(input: { discussionId: "$DiscussionId" }) {
    discussion {
      id
      pinned
    }
  }
}
"@

    try {
        $result = gh api graphql -f query=$mutation --jq '.data.pinDiscussion.discussion' | ConvertFrom-Json
        if ($result) {
            Write-Host "     📌 Pinned successfully" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "     ⚠️  Could not pin (may need manual pinning)" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "Creating discussions..." -ForegroundColor Cyan
Write-Host ""

$discussions = @()

# 1. Welcome to anchorpipe! (General)
$disc = Create-Discussion -CategoryId $categoryGeneral.id -Title "👋 Welcome to anchorpipe Discussions!" -BodyFile "welcome-to-anchorpipe.md" -RepositoryId $repoId
if ($disc) {
    $discussions += $disc
    Start-Sleep -Seconds 1
    Pin-Discussion -DiscussionId $disc.id
}

# 2. How to Contribute (General)
$disc = Create-Discussion -CategoryId $categoryGeneral.id -Title "🛠️ How to Contribute to anchorpipe" -BodyFile "how-to-contribute.md" -RepositoryId $repoId
if ($disc) {
    $discussions += $disc
    Start-Sleep -Seconds 1
    Pin-Discussion -DiscussionId $disc.id
}

# 3. Epic 0 Completion Announcement (Announcements)
$disc = Create-Discussion -CategoryId $categoryAnnouncements.id -Title "🎉 Epic 0 (G0 Foundation) - COMPLETE!" -BodyFile "epic-0-completion-announcement.md" -RepositoryId $repoId
if ($disc) {
    $discussions += $disc
    Start-Sleep -Seconds 1
    Pin-Discussion -DiscussionId $disc.id
}

# 4. Project Roadmap (Announcements)
$disc = Create-Discussion -CategoryId $categoryAnnouncements.id -Title "🗺️ anchorpipe Project Roadmap" -BodyFile "project-roadmap.md" -RepositoryId $repoId
if ($disc) {
    $discussions += $disc
    Start-Sleep -Seconds 1
    Pin-Discussion -DiscussionId $disc.id
}

Write-Host ""
Write-Host "✅ Done! Created $($discussions.Count) discussions." -ForegroundColor Green
Write-Host ""
Write-Host "Discussions created:" -ForegroundColor Cyan
$discussions | ForEach-Object {
    Write-Host "  - $($_.title)" -ForegroundColor White
    Write-Host "    $($_.url)" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify discussions at: https://github.com/anchorpipe/anchorpipe/discussions"
Write-Host "  2. Check that pinned discussions are visible"
Write-Host "  3. If any discussions weren't pinned, pin them manually"

