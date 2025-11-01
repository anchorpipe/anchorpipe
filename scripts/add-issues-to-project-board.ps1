# PowerShell script to help add issues to GitHub Project V2
# Since API requires additional scopes, this provides a helper approach

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectNumber = "3",
    
    [Parameter(Mandatory=$false)]
    [string]$Owner = "anchorpipe",
    
    [Parameter(Mandatory=$false)]
    [string]$Repo = "anchorpipe"
)

Write-Host "`n=== Add Issues to Project Board ===" -ForegroundColor Cyan
Write-Host "Project: https://github.com/orgs/$Owner/projects/$ProjectNumber`n" -ForegroundColor Yellow

# Get all issues
Write-Host "Fetching all issues..." -ForegroundColor Green
$issues = gh api "repos/$Owner/$Repo/issues" --paginate --jq '.[] | {number: .number, title: .title, url: .html_url, labels: [.labels[].name]}' | ConvertFrom-Json

Write-Host "  ✓ Found $($issues.Count) issues`n" -ForegroundColor Green

# Group by gate for easier organization
$issuesByGate = @{}
foreach ($issue in $issues) {
    $gateLabel = $issue.labels | Where-Object { $_ -match '^gate:' } | Select-Object -First 1
    $gate = if ($gateLabel) { $gateLabel -replace '^gate:', '' } else { 'none' }
    
    if (-not $issuesByGate.ContainsKey($gate)) {
        $issuesByGate[$gate] = @()
    }
    $issuesByGate[$gate] += $issue
}

Write-Host "Issues grouped by gate:" -ForegroundColor Cyan
foreach ($gate in ($issuesByGate.Keys | Sort-Object)) {
    Write-Host "  Gate $gate : $($issuesByGate[$gate].Count) issues" -ForegroundColor White
}

Write-Host "`n=== Method 1: GitHub UI Bulk Add (Recommended) ===" -ForegroundColor Cyan
Write-Host "`n1. Open project board:" -ForegroundColor Yellow
Write-Host "   https://github.com/orgs/$Owner/projects/$ProjectNumber" -ForegroundColor White

Write-Host "`n2. Click 'Add item' → 'Import from issues'" -ForegroundColor Yellow

Write-Host "`n3. Filter by gate (optional):" -ForegroundColor Yellow
foreach ($gate in ($issuesByGate.Keys | Sort-Object)) {
    if ($gate -ne 'none') {
        $count = $issuesByGate[$gate].Count
        Write-Host "   - Filter by 'gate:$gate' label → $count issues" -ForegroundColor White
    }
}

Write-Host "`n4. Or select all issues at once" -ForegroundColor Yellow
Write-Host "   Total: $($issues.Count) issues" -ForegroundColor White

Write-Host "`n=== Method 2: GitHub CLI with PAT ===" -ForegroundColor Cyan
Write-Host "`nIf you have a Personal Access Token with 'read:project' and 'write:project' scopes:" -ForegroundColor Yellow
Write-Host "`n1. Create PAT: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Set token: `$env:GITHUB_TOKEN = 'your_token'" -ForegroundColor White
Write-Host "3. Run: .\scripts\setup-project-v2.ps1 -ProjectNumber $ProjectNumber" -ForegroundColor White

Write-Host "`n=== Method 3: One-by-One via Script ===" -ForegroundColor Cyan
Write-Host "`nWould you like me to generate a script that adds issues one-by-one?" -ForegroundColor Yellow
Write-Host "(This will be slower but automated)" -ForegroundColor Gray

Write-Host "`n=== Quick Links ===" -ForegroundColor Cyan
Write-Host "Project Board: https://github.com/orgs/$Owner/projects/$ProjectNumber" -ForegroundColor White
Write-Host "All Issues: https://github.com/$Owner/$Repo/issues" -ForegroundColor White
Write-Host "Issues List: issues-list.json (local file)" -ForegroundColor White

# Save filtered lists
if (-not (Test-Path "scripts/project-setup")) {
    New-Item -ItemType Directory -Path "scripts/project-setup" | Out-Null
}

# Save by gate
foreach ($gate in $issuesByGate.Keys) {
    if ($gate -ne 'none') {
        $issuesByGate[$gate] | ConvertTo-Json | Out-File "scripts/project-setup/issues-gate-$gate.json"
    }
}

Write-Host "`nSaved issue lists by gate to: scripts/project-setup/" -ForegroundColor Green
Write-Host "`n💡 Tip: Use the GitHub UI method - it's the fastest and most reliable!" -ForegroundColor Cyan
