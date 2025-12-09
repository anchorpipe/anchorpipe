# Multi-stage Dockerfile for Next.js web application
ARG NPM_VERSION=11.1.0
ARG GLOB_VERSION=11.1.0
ARG BRACE_EXPANSION_VERSION=2.0.2

# Stage 1: Dependencies
FROM node:25-alpine AS deps
ARG NPM_VERSION
ARG GLOB_VERSION
ARG BRACE_EXPANSION_VERSION
WORKDIR /app

# Install dependencies needed for native modules and patch BusyBox CVEs
RUN apk add --no-cache libc6-compat \
  && apk upgrade --no-cache busybox busybox-binsh ssl_client

# Patch npm toolchain CVEs (glob/tar/brace-expansion) in this layer
RUN set -eux; \
  npm install -g npm@${NPM_VERSION} glob@${GLOB_VERSION} brace-expansion@${BRACE_EXPANSION_VERSION}; \
  NPM_ROOT="$(npm root -g)"; \
  PATCH_DIR="${NPM_ROOT}/npm/node_modules"; \
  rm -rf "${PATCH_DIR}/glob" "${PATCH_DIR}/brace-expansion"; \
  ln -s "${NPM_ROOT}/glob" "${PATCH_DIR}/glob"; \
  ln -s "${NPM_ROOT}/brace-expansion" "${PATCH_DIR}/brace-expansion"; \
  export PATCH_DIR GLOB_VERSION BRACE_EXPANSION_VERSION; \
  INSTALLED_GLOB="$(node -e 'console.log(require(process.env.PATCH_DIR + "/glob/package.json").version)')"; \
  [ "${INSTALLED_GLOB}" = "${GLOB_VERSION}" ]; \
  INSTALLED_BRACE="$(node -e 'console.log(require(process.env.PATCH_DIR + "/brace-expansion/package.json").version)')"; \
  [ "${INSTALLED_BRACE}" = "${BRACE_EXPANSION_VERSION}" ]

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/
COPY libs/mq/package.json ./libs/mq/
COPY libs/redis/package.json ./libs/redis/
COPY libs/storage/package.json ./libs/storage/

# Install all dependencies at repo root (single install)
RUN npm install --legacy-peer-deps && \
    npm install --no-save --include=optional || npm install --no-save

# Stage 2: Builder
FROM node:25-alpine AS builder
ARG NPM_VERSION
ARG GLOB_VERSION
ARG BRACE_EXPANSION_VERSION
WORKDIR /app

# Patch BusyBox CVEs in builder layer as well
RUN apk upgrade --no-cache busybox busybox-binsh ssl_client

# Keep npm toolchain patched in builder layer
RUN set -eux; \
  npm install -g npm@${NPM_VERSION} glob@${GLOB_VERSION} brace-expansion@${BRACE_EXPANSION_VERSION}; \
  NPM_ROOT="$(npm root -g)"; \
  PATCH_DIR="${NPM_ROOT}/npm/node_modules"; \
  rm -rf "${PATCH_DIR}/glob" "${PATCH_DIR}/brace-expansion"; \
  ln -s "${NPM_ROOT}/glob" "${PATCH_DIR}/glob"; \
  ln -s "${NPM_ROOT}/brace-expansion" "${PATCH_DIR}/brace-expansion"; \
  export PATCH_DIR GLOB_VERSION BRACE_EXPANSION_VERSION; \
  INSTALLED_GLOB="$(node -e 'console.log(require(process.env.PATCH_DIR + "/glob/package.json").version)')"; \
  [ "${INSTALLED_GLOB}" = "${GLOB_VERSION}" ]; \
  INSTALLED_BRACE="$(node -e 'console.log(require(process.env.PATCH_DIR + "/brace-expansion/package.json").version)')"; \
  [ "${INSTALLED_BRACE}" = "${BRACE_EXPANSION_VERSION}" ]

# Provide a dummy DATABASE_URL so Prisma adapter initialization does not throw during build
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/build

# Copy dependency installation from previous stage
COPY --from=deps /app/node_modules ./node_modules
# Copy package files (for context)
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/
COPY libs/mq/package.json ./libs/mq/
COPY libs/redis/package.json ./libs/redis/
COPY libs/storage/package.json ./libs/storage/
COPY tsconfig.base.json ./

# (No additional npm ci commands here; reuse installed deps)
# Copy ALL source code (must happen after npm ci for workspaces)
# Copy web app source
COPY apps/web ./apps/web

# Copy database library source files
# Remove any existing content first to ensure clean copy
WORKDIR /app
RUN rm -rf ./libs/database/src ./libs/database/prisma ./libs/database/tsconfig.json 2>/dev/null || true

# Copy database library contents explicitly
COPY libs/database/prisma ./libs/database/prisma
COPY libs/database/src ./libs/database/src
COPY libs/database/tsconfig.json ./libs/database/tsconfig.json

# Copy mq library contents
COPY libs/mq/src ./libs/mq/src
# Copy redis library contents
COPY libs/redis/src ./libs/redis/src
COPY libs/redis/tsconfig.json ./libs/redis/tsconfig.json
# Copy storage library contents
COPY libs/storage/src ./libs/storage/src
COPY libs/storage/tsconfig.json ./libs/storage/tsconfig.json

# Set working directory to database library for Prisma generation
WORKDIR /app/libs/database

# Verify Prisma schema exists
RUN ls -la && echo "---" && ls -la prisma/ || (echo "ERROR: prisma directory not found!" && find . -name prisma -type d && exit 1)
RUN test -f prisma/schema.prisma || (echo "ERROR: schema.prisma not found!" && echo "Contents of prisma/:" && ls -la prisma/ && exit 1)

# Generate Prisma Client
RUN npm run db:generate

# Set working directory back to web app
WORKDIR /app/apps/web

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:25-alpine AS runner
ARG NPM_VERSION
ARG GLOB_VERSION
ARG BRACE_EXPANSION_VERSION
WORKDIR /app

# Patch BusyBox CVEs in final runtime image
RUN apk upgrade --no-cache busybox busybox-binsh ssl_client

# Ensure final image ships patched npm dependencies
RUN set -eux; \
  npm install -g npm@${NPM_VERSION} glob@${GLOB_VERSION} brace-expansion@${BRACE_EXPANSION_VERSION}; \
  NPM_ROOT="$(npm root -g)"; \
  PATCH_DIR="${NPM_ROOT}/npm/node_modules"; \
  rm -rf "${PATCH_DIR}/glob" "${PATCH_DIR}/brace-expansion"; \
  ln -s "${NPM_ROOT}/glob" "${PATCH_DIR}/glob"; \
  ln -s "${NPM_ROOT}/brace-expansion" "${PATCH_DIR}/brace-expansion"; \
  export PATCH_DIR GLOB_VERSION BRACE_EXPANSION_VERSION; \
  INSTALLED_GLOB="$(node -e 'console.log(require(process.env.PATCH_DIR + "/glob/package.json").version)')"; \
  [ "${INSTALLED_GLOB}" = "${GLOB_VERSION}" ]; \
  INSTALLED_BRACE="$(node -e 'console.log(require(process.env.PATCH_DIR + "/brace-expansion/package.json").version)')"; \
  [ "${INSTALLED_BRACE}" = "${BRACE_EXPANSION_VERSION}" ]

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Copy Prisma files if needed
COPY --from=builder /app/libs/database ./libs/database

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

