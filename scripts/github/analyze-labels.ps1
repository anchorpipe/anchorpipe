# Script to analyze existing labels and compare with expected taxonomy

param(
    [Parameter(Mandatory=$false)]
    [string]$Owner = "anchorpipe",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "anchorpipe"
)

Write-Host "`n=== Label Analysis ===" -ForegroundColor Cyan
Write-Host "Repository: $Owner/$Repo`n" -ForegroundColor Yellow

# Get all labels
Write-Host "Fetching all labels..." -ForegroundColor Green
$allLabels = gh api repos/$Owner/$Repo/labels --paginate --jq '.' | ConvertFrom-Json

Write-Host "Total labels: $($allLabels.Count)" -ForegroundColor Cyan

# Group by prefix
$labelsByPrefix = @{}
foreach ($label in $allLabels) {
    if ($label.name -match '^([^:]+):') {
        $prefix = $matches[1]
    } else {
        $prefix = "other"
    }
    if (-not $labelsByPrefix.ContainsKey($prefix)) {
        $labelsByPrefix[$prefix] = @()
    }
    $labelsByPrefix[$prefix] += $label
}

# Display labels by category
Write-Host "`nLabels by category:" -ForegroundColor Yellow
foreach ($prefix in ($labelsByPrefix.Keys | Sort-Object)) {
    $count = $labelsByPrefix[$prefix].Count
    Write-Host "`n  $prefix : $count labels" -ForegroundColor Cyan
    $labelsByPrefix[$prefix] | ForEach-Object {
        Write-Host "    - $($_.name)" -ForegroundColor White
    }
}

# Check label usage
Write-Host "`n`nChecking label usage on issues..." -ForegroundColor Green
$labelCounts = @{}
$page = 1
$totalIssues = 0

while ($true) {
    $issuesJson = gh api "repos/$Owner/$Repo/issues?per_page=100&page=$page&state=all" --jq '.' 2>&1
    if ($LASTEXITCODE -ne 0) { break }
    
    $issues = $issuesJson | ConvertFrom-Json
    if ($issues.Count -eq 0) { break }
    
    $totalIssues += $issues.Count
    
    foreach ($issue in $issues) {
        if ($issue.labels) {
            foreach ($label in $issue.labels) {
                $labelName = $label.name
                if ($labelCounts.ContainsKey($labelName)) {
                    $labelCounts[$labelName]++
                } else {
                    $labelCounts[$labelName] = 1
                }
            }
        }
    }
    
    if ($issues.Count -lt 100) { break }
    $page++
}

Write-Host "  Total issues checked: $totalIssues" -ForegroundColor Cyan

# Display most used labels
Write-Host "`nMost used labels (top 30):" -ForegroundColor Yellow
$labelCounts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30 | ForEach-Object {
    $usagePercent = [math]::Round(($_.Value / $totalIssues) * 100, 1)
    Write-Host "  $($_.Key): $($_.Value) issues ($usagePercent%)" -ForegroundColor White
}

# Labels used but not many issues
Write-Host "`nLabels used on few issues (< 5):" -ForegroundColor Yellow
$labelCounts.GetEnumerator() | Where-Object { $_.Value -lt 5 } | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value) issues" -ForegroundColor Gray
}

# Labels not used
Write-Host "`nLabels not used on any issues:" -ForegroundColor Yellow
$usedLabelNames = $labelCounts.Keys
$unusedLabels = $allLabels | Where-Object { $usedLabelNames -notcontains $_.name } | Sort-Object name
if ($unusedLabels.Count -gt 0) {
    $unusedLabels | ForEach-Object {
        Write-Host "  - $($_.name)" -ForegroundColor Gray
    }
} else {
    Write-Host "  (none - all labels are used)" -ForegroundColor Green
}

Write-Host "`n✓ Analysis complete!" -ForegroundColor Green

