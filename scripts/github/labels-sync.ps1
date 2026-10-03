param(
  [string]$Owner = "anchorpipe",
  [string]$Repo = "anchorpipe",
  [string]$LabelsFile = ".github/labels.yml"
)

# Requires: gh, PowerShell 7+, and yq (optional). We'll parse YAML in PS directly.

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "GitHub CLI (gh) is required. Install via winget install GitHub.cli"
  exit 1
}

if (-not (Test-Path $LabelsFile)) {
  Write-Error "Labels file not found: $LabelsFile"
  exit 1
}

# Parse YAML to objects
$content = Get-Content $LabelsFile -Raw
$yaml = ($content | ConvertFrom-Yaml)
$labels = $yaml.labels

if (-not $labels) {
  Write-Error "No labels found in $LabelsFile"
  exit 1
}

function Upsert-Label($label) {
  $name = $label.name
  $color = $label.color -replace '#',''
  $desc = $label.description

  # Try create
  $createCmd = @(
    "api",
    "--method", "POST",
    "repos/$Owner/$Repo/labels",
    "-f", "name=$name",
    "-f", "color=$color"
  )
  if ($desc) { $createCmd += @("-f", "description=$desc") }

  $create = gh @createCmd 2>&1
  if ($LASTEXITCODE -ne 0 -and ($create -like "*already_exists*" -or $create -like "*exists*")) {
    # Update existing label
    $encoded = [System.Web.HttpUtility]::UrlEncode($name)
    $updateCmd = @(
      "api",
      "--method", "PATCH",
      "repos/$Owner/$Repo/labels/$encoded",
      "-f", "new_name=$name",
      "-f", "color=$color"
    )
    if ($desc) { $updateCmd += @("-f", "description=$desc") }
    gh @updateCmd | Out-Null
  } else {
    $create | Out-Null
  }
}

foreach ($l in $labels) {
  Upsert-Label $l
}

Write-Host "Labels sync complete for $Owner/$Repo"