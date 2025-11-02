# @anchorpipe/database

Database package for anchorpipe using Prisma ORM.

## Setup

1. **Install dependencies** (already done at root):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root with:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:15432/anchorpipe_dev?schema=public
   ```

3. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

4. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Seed database** (optional):
   ```bash
   npm run db:seed
   ```

## Development

- **Prisma Studio** (visual database browser):
  ```bash
  npm run db:studio
  ```

- **Create a new migration**:
  ```bash
  npm run db:migrate
  ```
  This will prompt for a migration name if there are schema changes.

## Schema

The database schema includes:

- `repos` - Repository information
- `users` - User accounts
- `test_cases` - Test case definitions
- `test_runs` - Test execution results
- `flake_scores` - Flakiness scoring data
- `telemetry_events` - System telemetry
- `repository_configs` - Repository configurations
- `notifications` - User notifications
- `owner_maps` - Test ownership mapping

See `prisma/schema.prisma` for the complete schema definition.

## Usage

```typescript
import { prisma, healthCheck } from '@anchorpipe/database';

// Check database health
const isHealthy = await healthCheck();

// Query data
const repos = await prisma.repo.findMany();

// Create data
const repo = await prisma.repo.create({
  data: {
    name: 'my-repo',
    owner: 'my-org',
    visibility: 'public',
  },
});
```

## Health Check Endpoint

The database health check is available at:
- **URL**: `/api/health/db`
- **Method**: GET
- **Response**: JSON with database connection status
