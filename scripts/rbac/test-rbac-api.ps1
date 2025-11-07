# Test RBAC API Endpoints
# This script tests the RBAC API endpoints

$baseUrl = "http://localhost:3001"
$testEmail = "test@example.com"
$testPassword = "TestPassword123!"

Write-Host "=== RBAC API Test Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Register a test user
Write-Host "Step 1: Registering test user..." -ForegroundColor Yellow
$registerBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✓ User registered successfully" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "⚠ User already exists, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Login to get session
Write-Host ""
Write-Host "Step 2: Logging in..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    Write-Host "✓ Login successful" -ForegroundColor Green
    
    # Extract cookies for future requests
    $cookies = $session.Cookies.GetCookies($baseUrl)
    $cookieHeader = $cookies | ForEach-Object { "$($_.Name)=$($_.Value)" } | Join-String -Separator "; "
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get user info to get user ID
Write-Host ""
Write-Host "Step 3: Getting user info..." -ForegroundColor Yellow
try {
    $userInfo = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -WebSession $session
    $userId = $userInfo.user.id
    Write-Host "✓ User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get user info: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Create a test repo (or use existing)
Write-Host ""
Write-Host "Step 4: Creating test repository..." -ForegroundColor Yellow
# Note: This assumes you have a repo creation endpoint or a test repo exists
# For now, we'll use a placeholder repo ID
$testRepoId = "00000000-0000-0000-0000-000000000001"
Write-Host "⚠ Using test repo ID: $testRepoId" -ForegroundColor Yellow
Write-Host "  (You may need to create a repo first or use an existing repo ID)" -ForegroundColor Yellow

# Step 5: Assign admin role to user (first user becomes admin)
Write-Host ""
Write-Host "Step 5: Assigning admin role..." -ForegroundColor Yellow
$assignRoleBody = @{
    userId = $userId
    role = "admin"
} | ConvertTo-Json

try {
    $assignResponse = Invoke-RestMethod -Uri "$baseUrl/api/repos/$testRepoId/roles" -Method POST -Body $assignRoleBody -ContentType "application/json" -WebSession $session
    Write-Host "✓ Admin role assigned successfully" -ForegroundColor Green
    Write-Host "  Response: $($assignResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to assign role: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
}

# Step 6: Get all users with roles
Write-Host ""
Write-Host "Step 6: Getting all users with roles..." -ForegroundColor Yellow
try {
    $usersResponse = Invoke-RestMethod -Uri "$baseUrl/api/repos/$testRepoId/roles" -Method GET -WebSession $session
    Write-Host "✓ Retrieved users with roles" -ForegroundColor Green
    Write-Host "  Users: $($usersResponse.users | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get users: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 7: Get audit logs
Write-Host ""
Write-Host "Step 7: Getting audit logs..." -ForegroundColor Yellow
try {
    $auditResponse = Invoke-RestMethod -Uri "$baseUrl/api/repos/$testRepoId/roles/audit" -Method GET -WebSession $session
    Write-Host "✓ Retrieved audit logs" -ForegroundColor Green
    Write-Host "  Logs: $($auditResponse.logs | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get audit logs: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: To test role removal, you can use:" -ForegroundColor Yellow
Write-Host "  DELETE $baseUrl/api/repos/$testRepoId/roles" -ForegroundColor Gray
Write-Host "  Body: { `"userId`": `"$userId`" }" -ForegroundColor Gray

