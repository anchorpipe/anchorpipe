# Local Testing Guide

This guide helps you test Anchorpipe features locally before deploying to production. You don't need a domain or production setup to test most functionality.

## Prerequisites

1. **Docker and Docker Compose** - For running local services
2. **Node.js 20+** - For running the web application
3. **Git** - For cloning repositories
4. **ngrok or localtunnel** (optional) - For testing webhooks

## Quick Start

### 1. Start Local Services

```bash
# Start PostgreSQL, Redis, RabbitMQ, and MinIO
docker-compose -f infra/docker-compose.yml up -d

# Verify services are running
docker ps
```

You should see:

- `anchorpipe_db` (PostgreSQL on port 15432)
- `anchorpipe_redis` (Redis on port 6379)
- `anchorpipe_mq` (RabbitMQ on ports 5672, 15672)
- `anchorpipe_storage` (MinIO on ports 9000, 9001)

### 2. Set Up Environment Variables

Create `.env.local` in the project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:15432/anchorpipe_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# RabbitMQ
RABBIT_URL="amqp://guest:guest@localhost:5672"

# MinIO (S3-compatible)
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadminpassword"
S3_BUCKET="anchorpipe-dev"

# Application
NEXTAUTH_SECRET="your-secret-key-here-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# GitHub App (for webhook testing)
GITHUB_APP_ID="your-app-id"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# Email (console output for local testing)
EMAIL_PROVIDER="console"
EMAIL_FROM="noreply@localhost"

# SIEM (optional, for testing)
SIEM_ENABLED="false"
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed test data
npm run db:seed
```

### 4. Start Development Server

```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev
```

The application will be available at `http://localhost:3000`.

If you encounter "address already in use" on port 3000:

```bash
# macOS/Linux
lsof -i :3000 | awk 'NR>1 {print $2}' | xargs -r kill -9

# Windows PowerShell
netstat -ano | Select-String -Pattern ":3000"
Stop-Process -Id <PID_FROM_ABOVE> -Force
```

## Testing Test Report Parsers

### Create Sample Test Reports

Create a directory for test files:

```bash
mkdir -p test-data/reports
```

### Test Jest Parser

Create `test-data/reports/jest-report.json`:

```json
{
  "name": "test-suite",
  "status": "passed",
  "startTime": 1704067200000,
  "assertionResults": [
    {
      "ancestorTitles": ["Utils"],
      "fullName": "src/utils.test.ts > Utils > should work",
      "status": "passed",
      "title": "should work",
      "duration": 100
    },
    {
      "ancestorTitles": ["Utils"],
      "fullName": "src/utils.test.ts > Utils > should fail",
      "status": "failed",
      "title": "should fail",
      "duration": 50,
      "failureMessages": ["Expected true to be false"]
    }
  ]
}
```

Run the parser test script:

```bash
node tempo-local/scripts/test-parser.js jest test-data/reports/jest-report.json
```

### Test PyTest Parser

Create `test-data/reports/pytest-report.json`:

```json
{
  "report": {
    "tests": [
      {
        "nodeid": "tests/test_example.py::test_function",
        "outcome": "passed",
        "duration": 0.5,
        "call": {
          "outcome": "passed",
          "duration": 0.5
        }
      },
      {
        "nodeid": "tests/test_example.py::TestClass::test_method",
        "outcome": "failed",
        "duration": 0.3,
        "call": {
          "outcome": "failed",
          "duration": 0.3,
          "longrepr": "AssertionError: Expected 1, got 2"
        }
      }
    ]
  }
}
```

```bash
node tempo-local/scripts/test-parser.js pytest test-data/reports/pytest-report.json
```

### Test JUnit Parser

Create `test-data/reports/junit-report.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="TestSuite" tests="2" failures="1" time="1.5" timestamp="2025-01-01T00:00:00">
  <testcase name="testPass" classname="com.example.TestClass" time="1.0"/>
  <testcase name="testFail" classname="com.example.TestClass" time="0.5">
    <failure message="Assertion failed">Expected true, got false</failure>
  </testcase>
</testsuite>
```

```bash
node tempo-local/scripts/test-parser.js junit test-data/reports/junit-report.xml
```

### Test Playwright Parser

Create `test-data/reports/playwright-report.json`:

```json
{
  "suites": [
    {
      "title": "Test Suite",
      "file": "tests/example.spec.ts",
      "specs": [
        {
          "title": "Test Spec",
          "file": "tests/example.spec.ts",
          "tests": [
            {
              "title": "should pass",
              "results": [
                {
                  "status": "passed",
                  "duration": 1000,
                  "startTime": "2025-01-01T00:00:00.000Z"
                }
              ]
            },
            {
              "title": "should fail",
              "results": [
                {
                  "status": "failed",
                  "duration": 500,
                  "startTime": "2025-01-01T00:00:00.000Z",
                  "error": {
                    "message": "Test failed",
                    "stack": "Error: Test failed\n    at ..."
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

```bash
node tempo-local/scripts/test-parser.js playwright test-data/reports/playwright-report.json
```

## Testing Ingestion Endpoint

### 1. Create a Test Repository and HMAC Secret

First, you need to create a test repository in the database and generate an HMAC secret. Use the admin script:

```bash
node tempo-local/scripts/create-test-repo.js
```

This will output:

- Repository ID (UUID)
- HMAC Secret

### 2. Create Test Payload

Create `test-data/ingestion-payload.json`:

```json
{
  "repo_id": "YOUR_REPO_ID_HERE",
  "commit_sha": "a1b2c3d4e5f6789012345678901234567890abcd",
  "run_id": "test-run-001",
  "framework": "jest",
  "tests": [
    {
      "path": "src/utils.test.ts",
      "name": "should work",
      "status": "pass",
      "durationMs": 100,
      "startedAt": "2025-01-01T00:00:00.000Z",
      "tags": ["unit"]
    },
    {
      "path": "src/utils.test.ts",
      "name": "should fail",
      "status": "fail",
      "durationMs": 50,
      "startedAt": "2025-01-01T00:00:00.000Z",
      "failureDetails": "Expected true to be false"
    }
  ],
  "branch": "main",
  "environment": {
    "CI": "local-test",
    "NODE_VERSION": "20"
  }
}
```

### 3. Compute HMAC Signature

```bash
# Using Node.js
node tempo-local/scripts/compute-hmac.js test-data/ingestion-payload.json YOUR_HMAC_SECRET

# Or using OpenSSL
SIGNATURE=$(cat test-data/ingestion-payload.json | openssl dgst -sha256 -hmac "YOUR_HMAC_SECRET" | cut -d' ' -f2)
echo $SIGNATURE
```

### 4. Submit to Ingestion Endpoint

```bash
curl -X POST http://localhost:3000/api/ingestion \
  -H "Authorization: Bearer YOUR_REPO_ID" \
  -H "X-FR-Sig: YOUR_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d @test-data/ingestion-payload.json
```

Expected response:

```json
{
  "runId": "test-run-001",
  "message": "Test report received",
  "summary": {
    "tests_parsed": 2,
    "flaky_candidates": 0
  }
}
```

## Testing GitHub App Webhooks

### 1. Set Up ngrok (or localtunnel)

Install ngrok:

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

Start ngrok tunnel:

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`).

### 2. Configure GitHub App Webhook

1. Go to your GitHub App settings
2. Set Webhook URL to: `https://abc123.ngrok.io/api/webhooks/github-app`
3. Set Webhook Secret to match `GITHUB_WEBHOOK_SECRET` in your `.env.local`
4. Subscribe to events:
   - `installation`
   - `installation_repositories`
   - `workflow_run`
   - `check_run`

### 3. Test Installation Event

Install the GitHub App on a test repository. You should see:

1. Webhook event received in your terminal
2. Installation record created in database
3. Audit log entry created

### 4. Test Workflow Run Event

1. Create a test GitHub Actions workflow that runs tests
2. Push to trigger the workflow
3. When workflow completes, webhook should trigger ingestion

## Testing Email Notifications

Email notifications use a console provider in local development. Check your terminal output for email content.

To test:

```bash
# Trigger password reset email
curl -X POST http://localhost:3000/api/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check terminal for email output
```

## Testing SIEM Integration

### 1. Set Up Mock SIEM Server

Create a simple HTTP server to receive SIEM logs:

```bash
node tempo-local/scripts/mock-siem-server.js
```

This starts a server on `http://localhost:3001` that logs all received events.

### 2. Configure SIEM

Update `.env.local` (ensure a single copy of each line; remove duplicates):

```bash
SIEM_ENABLED=true
SIEM_TYPE=http
SIEM_HTTP_URL=http://localhost:3001/siem
SIEM_HTTP_HEADERS={"Content-Type":"application/json"}
```

### 3. Trigger SIEM Forwarding

If the admin endpoint requires admin privileges, use an admin token/session. Otherwise, skip locally and validate that the mock SIEM receives events in flows permitted in dev.

Check the mock server terminal for received logs.

## Testing Authentication

In local dev, the login endpoint issues a session cookie (not a bearer token). Use the helper scripts to avoid shell quoting issues.

### 1. Register a Test User (helper script)

```bash
node tempo-local/http/register.js "test+siem@example.com" "TestPassword123!" "SIEM Tester"
```

### 2. Login and capture session cookie

```bash
node tempo-local/http/login.js "test+siem@example.com" "TestPassword123!"
```

The output includes a `cookie` field (Set-Cookie). Use it for authenticated requests.

### 3. Test Password Reset

```bash
node tempo-local/http/password-reset-request.js "test+siem@example.com"

Check the server terminal for email output.
```

## Testing DSR (Data Subject Requests)

### 1. Request Data Export (with cookie)

```bash
# Paste the cookie from the login output
COOKIE='ap_session=...'
node tempo-local/http/dsr-export-cookie.js "$COOKIE"
```

### 2. Download Export (with cookie)

```bash
# Use the requestId from the export step
node tempo-local/http/dsr-download-cookie.js "$COOKIE" "REQUEST_ID"
cat tempo-local/http/export.json | head -n 40
```

Note: If a "verify email" route is missing or returns 404 in dev, prefer the session cookie flows above to exercise authenticated endpoints.

## Integration Testing Scripts

### Run All Parser Tests

```bash
npm run test:parsers
```

### Run Ingestion Endpoint Tests

```bash
npm run test:ingestion
```

### Run Full Integration Test

```bash
npm run test:integration
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep anchorpipe_db

# Check connection
psql -h localhost -p 15432 -U postgres -d anchorpipe_dev
```

### RabbitMQ Not Receiving Messages

```bash
# Check RabbitMQ management UI
open http://localhost:15672
# Login: guest / guest

# Check queues
```

### Ingestion Worker (dev-only)

The queue consumer under `services/ingestion` is a development helper to validate async processing and DLQ behavior. It is disabled by default.

- Enable by setting:

```bash
INGESTION_WORKER_ENABLED=true
RABBIT_URL="amqp://guest:guest@localhost:5672"
```

- Notes:
  - This worker is dev-only per ADR‑0001/0007; production cutover will be a Rust/Go service.
  - `failure_details` are redacted before persistence per ADR‑0012.
  - Transient errors are retried briefly before messages are routed to the DLQ.

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Next Steps

After testing locally:

1. **Unit Tests**: Run `npm test` to verify all unit tests pass
2. **Integration Tests**: Run `npm run test:integration`
3. **Code Quality**: Run `npm run lint` and `npm run typecheck`
4. **Documentation**: Update docs based on testing findings

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Postman Collection](./postman-collection.json) (if available)
