# Multi-stage Dockerfile for Next.js web application
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/

# Install root dependencies
RUN npm ci --only=production --legacy-peer-deps

# Install workspace dependencies
WORKDIR /app/apps/web
RUN npm ci --only=production --legacy-peer-deps

WORKDIR /app/libs/database
RUN npm ci --only=production --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/
COPY tsconfig.base.json ./

# Install all dependencies (including dev)
RUN npm ci --legacy-peer-deps
WORKDIR /app/apps/web
RUN npm ci --legacy-peer-deps
WORKDIR /app/libs/database
RUN npm ci --legacy-peer-deps

# Copy source code
COPY apps/web ./apps/web

# Copy entire database library to ensure all files are included
COPY libs/database ./libs/database

# Set working directory to database library for Prisma generation
WORKDIR /app/libs/database

# Debug: List what we have in the current directory
RUN echo "=== Contents of /app/libs/database ===" && ls -la

# Debug: Check if prisma directory exists
RUN echo "=== Checking for prisma directory ===" && ls -la prisma/ || (echo "Prisma directory listing:" && find . -name "prisma" -type d || echo "No prisma directory found")

# Verify Prisma schema exists before generation
RUN test -f prisma/schema.prisma || (echo "ERROR: schema.prisma not found!" && echo "Current directory:" && pwd && echo "Directory contents:" && ls -la && echo "Searching for schema.prisma:" && find /app -name "schema.prisma" 2>/dev/null || echo "No schema.prisma found anywhere" && exit 1)

# Generate Prisma Client
RUN npm run db:generate

# Set working directory back to web app
WORKDIR /app/apps/web

# Build Next.js application
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

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

CMD ["node", "apps/web/server.js"]

