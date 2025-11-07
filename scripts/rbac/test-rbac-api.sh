#!/bin/bash
# Test RBAC API Endpoints
# This script tests the RBAC API endpoints

BASE_URL="http://localhost:3001"
TEST_EMAIL="test@example.com"
TEST_PASSWORD="TestPassword123!"

echo "=== RBAC API Test Script ==="
echo ""

# Step 1: Register a test user
echo "Step 1: Registering test user..."
REGISTER_BODY=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_BODY")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ User registered successfully"
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "⚠ User already exists, continuing..."
else
  echo "✗ Registration failed: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

# Step 2: Login to get session cookie
echo ""
echo "Step 2: Logging in..."
LOGIN_BODY=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

COOKIE_FILE=$(mktemp)
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" \
  -c "$COOKIE_FILE")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ Login successful"
else
  echo "✗ Login failed: HTTP $HTTP_CODE"
  exit 1
fi

# Step 3: Get user info to get user ID
echo ""
echo "Step 3: Getting user info..."
USER_INFO=$(curl -s -X GET "$BASE_URL/api/auth/me" -b "$COOKIE_FILE")
USER_ID=$(echo "$USER_INFO" | jq -r '.user.id // empty')

if [ -z "$USER_ID" ]; then
  echo "✗ Failed to get user ID"
  echo "$USER_INFO"
  exit 1
fi

echo "✓ User ID: $USER_ID"

# Step 4: Use test repo ID
echo ""
echo "Step 4: Using test repository..."
TEST_REPO_ID="00000000-0000-0000-0000-000000000001"
echo "⚠ Using test repo ID: $TEST_REPO_ID"
echo "  (You may need to create a repo first or use an existing repo ID)"

# Step 5: Assign admin role
echo ""
echo "Step 5: Assigning admin role..."
ASSIGN_BODY=$(cat <<EOF
{
  "userId": "$USER_ID",
  "role": "admin"
}
EOF
)

ASSIGN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/repos/$TEST_REPO_ID/roles" \
  -H "Content-Type: application/json" \
  -d "$ASSIGN_BODY" \
  -b "$COOKIE_FILE")

HTTP_CODE=$(echo "$ASSIGN_RESPONSE" | tail -n1)
BODY=$(echo "$ASSIGN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ Admin role assigned successfully"
  echo "$BODY" | jq '.'
else
  echo "✗ Failed to assign role: HTTP $HTTP_CODE"
  echo "$BODY"
fi

# Step 6: Get all users with roles
echo ""
echo "Step 6: Getting all users with roles..."
USERS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/repos/$TEST_REPO_ID/roles" -b "$COOKIE_FILE")
echo "✓ Retrieved users with roles"
echo "$USERS_RESPONSE" | jq '.'

# Step 7: Get audit logs
echo ""
echo "Step 7: Getting audit logs..."
AUDIT_RESPONSE=$(curl -s -X GET "$BASE_URL/api/repos/$TEST_REPO_ID/roles/audit" -b "$COOKIE_FILE")
echo "✓ Retrieved audit logs"
echo "$AUDIT_RESPONSE" | jq '.'

echo ""
echo "=== Test Complete ==="
echo ""
echo "Note: To test role removal, you can use:"
echo "  curl -X DELETE $BASE_URL/api/repos/$TEST_REPO_ID/roles \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"userId\": \"$USER_ID\"}' \\"
echo "    -b $COOKIE_FILE"

rm -f "$COOKIE_FILE"

