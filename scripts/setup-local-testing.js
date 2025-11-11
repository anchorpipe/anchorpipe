#!/usr/bin/env node

/**
 * Setup Local Testing Script
 *
 * Complete setup for local testing:
 * 1. Loads environment variables
 * 2. Runs database migrations
 * 3. Creates a test repository with HMAC secret
 *
 * Usage:
 *   node scripts/setup-local-testing.js [repo-name]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local not found. Run: node scripts/setup-local-env.js');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value;
      process.env[key.trim()] = value;
    }
  }
});

console.log('✅ Environment variables loaded');
console.log('');

// Check database connection
console.log('Checking database connection...');
try {
  const { prisma } = require('../libs/database/src/index.ts');
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Database connection successful');
  await prisma.$disconnect();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error('');
  console.error('Make sure:');
  console.error('  1. Docker is running');
  console.error('  2. Services are started: docker-compose -f infra/docker-compose.yml up -d');
  console.error('  3. DATABASE_URL is correct in .env.local');
  process.exit(1);
}

// Run migrations
console.log('');
console.log('Running database migrations...');
try {
  process.chdir(path.join(__dirname, '..', 'libs', 'database'));
  execSync('npm run db:migrate', { stdio: 'inherit', env: process.env });
  console.log('✅ Migrations completed');
} catch (error) {
  console.error('❌ Migration failed');
  process.exit(1);
} finally {
  process.chdir(__dirname);
}

// Create test repository
console.log('');
console.log('Creating test repository...');
const repoName = process.argv[2] || 'test-repo-local';
try {
  const result = execSync(
    `node scripts/create-test-repo.js ${repoName}`,
    { encoding: 'utf-8', env: process.env, cwd: path.join(__dirname, '..') }
  );
  console.log(result);
  console.log('✅ Setup complete!');
} catch (error) {
  console.error('❌ Failed to create test repository');
  console.error(error.message);
  process.exit(1);
}









