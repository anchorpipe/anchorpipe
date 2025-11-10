#!/usr/bin/env node

/**
 * Create Test Repository Script
 *
 * Creates a test repository in the database and generates an HMAC secret.
 *
 * Usage:
 *   node scripts/create-test-repo.js [repo-name]
 *
 * Example:
 *   node scripts/create-test-repo.js my-test-repo
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
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
}

// Register TypeScript support
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    esModuleInterop: true,
    skipLibCheck: true,
  },
});

// Import Prisma client and HMAC secret functions
const { prisma } = require('../libs/database/src/index.ts');
const {
  createHmacSecret,
  generateHmacSecret,
} = require('../apps/web/src/lib/server/hmac-secrets.ts');

async function main() {
  const repoName = process.argv[2] || 'test-repo';

  try {
    // Create repository first
    const repo = await prisma.repo.create({
      data: {
        name: repoName,
        owner: 'test',
        defaultBranch: 'main',
        visibility: 'public',
      },
    });

    // Generate and create HMAC secret using the proper function
    const secret = generateHmacSecret();
    const secretResult = await createHmacSecret({
      repoId: repo.id,
      name: 'Test Secret',
      secret,
    });

    console.log('✅ Test repository created!');
    console.log('');
    console.log('Repository ID:', repo.id);
    console.log('HMAC Secret:', secretResult.secret);
    console.log('');
    console.log('Add these to your test payload:');
    console.log(`  "repo_id": "${repo.id}"`);
    console.log('');
    console.log('Use this secret for HMAC signature:');
    console.log(`  ${secretResult.secret}`);
    console.log('');
    console.log('⚠️  Keep the secret secure!');
  } catch (error) {
    console.error('❌ Error creating repository:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
