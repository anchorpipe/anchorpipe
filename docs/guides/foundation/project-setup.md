# Project Setup and Development Environment (ST-101)

## Overview

Establishes the foundational project structure, development tooling, and local development environment. Sets up the monorepo with Nx, TypeScript, ESLint, Prettier, and Docker Compose for local services.

## Project Structure

```
anchorpipe/
├── apps/
│   └── web/          # Next.js web application
├── libs/
│   └── database/     # Prisma database client
├── services/         # Microservices (future)
├── packages/         # Shared packages
├── infra/            # Infrastructure as code
└── docs/             # Documentation
```

## Technology Stack

- **Monorepo**: Nx workspaces with npm
- **Language**: TypeScript 5.6+
- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL 16+ with Prisma ORM
- **Linting**: ESLint 9+
- **Formatting**: Prettier 3+
- **Containerization**: Docker Compose

## Development Environment

### Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Docker Desktop (or Docker Engine + Docker Compose V2)
- Git >= 2.40

### Local Setup

1. **Clone repository**

   ```bash
   git clone https://github.com/anchorpipe/anchorpipe.git
   cd anchorpipe
   ```

2. **Start local services**

   ```bash
   docker compose up -d
   ```

   Starts: PostgreSQL, Redis, RabbitMQ, MinIO

3. **Configure environment**

   ```bash
   echo DATABASE_URL=postgresql://postgres:postgres@localhost:15432/anchorpipe_dev > .env
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

6. **Start development server**
   ```bash
   cd apps/web
   npm run dev
   ```

## Tooling

### Linting

```bash
npm run lint
```

- ESLint configured for TypeScript
- Strict rules enabled
- Auto-fix available: `npm run lint -- --fix`

### Formatting

```bash
npm run format
```

- Prettier configured
- Consistent code style
- Pre-commit hooks (optional)

### Type Checking

```bash
npx tsc --noEmit
```

- Strict TypeScript configuration
- Type safety across monorepo

## Docker Services

### PostgreSQL

- Port: `15432`
- Database: `anchorpipe_dev`
- User: `postgres`
- Password: `postgres`

### Redis

- Port: `16379`
- Used for: Rate limiting, caching (future)

### RabbitMQ

- Port: `15672` (Management UI)
- Port: `5672` (AMQP)
- Used for: Message queue

### MinIO (S3-compatible)

- Port: `9000` (API)
- Port: `9001` (Console)
- Used for: Object storage

## Configuration Files

- `.gitignore` - Git ignore rules
- `.nvmrc` - Node.js version
- `package.json` - Dependencies and scripts
- `tsconfig.base.json` - TypeScript base config
- `eslint.config.mjs` - ESLint configuration
- `prettier.config.mjs` - Prettier configuration
- `nx.json` - Nx workspace configuration
- `docker-compose.yml` - Local services

## Scripts

- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run all tests
- `npm run build` - Build all projects
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## CI/CD

GitHub Actions workflows:

- `.github/workflows/ci.yml` - Lint, typecheck, build, test
- `.github/workflows/codeql.yml` - Security scanning
- `.github/workflows/security-scan.yml` - Dependency scanning

## Documentation

- `README.md` - Project overview
- `CONTRIBUTING.md` - Contribution guidelines
- `SECURITY.md` - Security policy
- `docs/` - Comprehensive documentation

## Related Documentation

- [Database Schema](database-schema.md) - Database setup
- [CI/CD Pipeline](cicd-pipeline.md) - CI/CD setup
- [Authentication](authentication.md) - Auth setup
