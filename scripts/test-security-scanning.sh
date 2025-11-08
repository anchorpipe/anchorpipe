#!/bin/bash
# Test script for security scanning workflows
# This simulates the security-scan.yml workflow locally

set -e

echo "🔍 Testing Security Scanning Pipeline"
echo "======================================"
echo ""

# Test 1: npm audit (SAST)
echo "1. Testing npm audit (SAST)..."
npm audit --audit-level=moderate --json > audit-results.json || true

if [ -f audit-results.json ]; then
  CRITICAL=$(jq -r '.metadata.vulnerabilities.critical // 0' audit-results.json 2>/dev/null || echo "0")
  HIGH=$(jq -r '.metadata.vulnerabilities.high // 0' audit-results.json 2>/dev/null || echo "0")
  MODERATE=$(jq -r '.metadata.vulnerabilities.moderate // 0' audit-results.json 2>/dev/null || echo "0")
  
  echo "   Critical: $CRITICAL"
  echo "   High: $HIGH"
  echo "   Moderate: $MODERATE"
  
  if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo "   ❌ Critical or High severity vulnerabilities found!"
    cat audit-results.json | jq '.vulnerabilities[] | select(.severity == "critical" or .severity == "high") | {name: .name, severity: .severity, title: .title}' 2>/dev/null || true
    exit 1
  else
    echo "   ✅ No critical or high severity vulnerabilities found"
  fi
else
  echo "   ⚠️  No audit results file generated"
fi

echo ""

# Test 2: Check for jq (required for workflow)
echo "2. Testing jq availability..."
if command -v jq &> /dev/null; then
  echo "   ✅ jq is available"
  JQ_VERSION=$(jq --version)
  echo "   Version: $JQ_VERSION"
else
  echo "   ❌ jq is not installed"
  echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

echo ""

# Test 3: Validate workflow YAML syntax
echo "3. Validating workflow YAML syntax..."
if command -v yamllint &> /dev/null; then
  yamllint .github/workflows/security-scan.yml && echo "   ✅ YAML syntax valid" || echo "   ❌ YAML syntax errors found"
elif command -v node &> /dev/null; then
  node -e "const yaml = require('yaml'); const fs = require('fs'); yaml.parse(fs.readFileSync('.github/workflows/security-scan.yml', 'utf8')); console.log('   ✅ YAML syntax valid')" 2>/dev/null || echo "   ⚠️  YAML validation skipped (yaml package not available)"
else
  echo "   ⚠️  YAML validation skipped (no validator available)"
fi

echo ""

# Test 4: Check Dependabot config
echo "4. Validating Dependabot configuration..."
if [ -f .github/dependabot.yml ]; then
  echo "   ✅ Dependabot config file exists"
  if command -v yamllint &> /dev/null; then
    yamllint .github/dependabot.yml && echo "   ✅ Dependabot YAML syntax valid" || echo "   ❌ Dependabot YAML syntax errors"
  fi
else
  echo "   ❌ Dependabot config file not found"
fi

echo ""

# Test 5: Check CodeQL workflow
echo "5. Validating CodeQL workflow..."
if [ -f .github/workflows/codeql.yml ]; then
  echo "   ✅ CodeQL workflow file exists"
  if command -v yamllint &> /dev/null; then
    yamllint .github/workflows/codeql.yml && echo "   ✅ CodeQL YAML syntax valid" || echo "   ❌ CodeQL YAML syntax errors"
  fi
else
  echo "   ❌ CodeQL workflow file not found"
fi

echo ""

# Cleanup
if [ -f audit-results.json ]; then
  rm audit-results.json
fi

echo "✅ Security scanning pipeline validation complete!"
echo ""
echo "Note: Full end-to-end testing requires:"
echo "  - PR to be created/merged to trigger workflows in GitHub Actions"
echo "  - SNYK_TOKEN secret configured for Snyk scanning (optional)"
echo "  - GitHub Actions runners to execute the workflows"

