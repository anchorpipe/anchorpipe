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

const { PrismaClient } = require('@anchorpipe/database');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const repoName = process.argv[2] || 'test-repo';

  try {
    // Generate HMAC secret
    const hmacSecret = crypto.randomBytes(32).toString('hex');

    // Create repository
    const repo = await prisma.repo.create({
      data: {
        name: repoName,
        fullName: `test/${repoName}`,
        provider: 'github',
        providerId: `test-${Date.now()}`,
        hmacSecrets: {
          create: {
            secret: hmacSecret,
            description: 'Test secret for local development',
            lastUsedAt: null,
          },
        },
      },
      include: {
        hmacSecrets: true,
      },
    });

    console.log('✅ Test repository created!');
    console.log('');
    console.log('Repository ID:', repo.id);
    console.log('HMAC Secret:', hmacSecret);
    console.log('');
    console.log('Add these to your test payload:');
    console.log(`  "repo_id": "${repo.id}"`);
    console.log('');
    console.log('Use this secret for HMAC signature:');
    console.log(`  ${hmacSecret}`);
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

