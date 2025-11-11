#!/usr/bin/env node

/**
 * Run Database Migrations
 *
 * Loads .env.local and runs Prisma migrations.
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
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  }
});

console.log('Running database migrations...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
console.log('');

try {
  process.chdir(path.join(__dirname, '..', 'libs', 'database'));
  execSync('npm run db:migrate', { stdio: 'inherit', env: process.env });
  console.log('');
  console.log('✅ Migrations completed successfully!');
} catch (error) {
  console.error('');
  console.error('❌ Migration failed');
  process.exit(1);
}









