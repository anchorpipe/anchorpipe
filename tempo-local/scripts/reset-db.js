#!/usr/bin/env node

/**
 * Reset Database Script
 *
 * Resets the database and runs migrations from scratch.
 * WARNING: This will delete all data!
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

console.log('⚠️  WARNING: This will delete all data in the database!');
console.log('Resetting database...');
console.log('');

try {
  process.chdir(path.join(__dirname, '..', 'libs', 'database'));
  execSync('npx prisma migrate reset --force', { stdio: 'inherit', env: process.env });
  console.log('');
  console.log('✅ Database reset and migrations completed!');
} catch (error) {
  console.error('');
  console.error('❌ Reset failed');
  process.exit(1);
}








