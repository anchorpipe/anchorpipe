/**
 * Database Seed Script
 *
 * Seeds the database with initial data for development and testing.
 *
 * Usage: npm run db:seed
 */

import { prisma } from './index';

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample repository
  const repo = await prisma.repo.upsert({
    where: { ghId: BigInt(123456789) },
    update: {},
    create: {
      ghId: BigInt(123456789),
      name: 'anchorpipe',
      owner: 'anchorpipe',
      defaultBranch: 'main',
      visibility: 'public',
      config: {
        enabled: true,
        autoDetectFlakes: true,
      },
    },
  });

  console.log('✅ Created sample repository:', repo.name);

  // Create repository config
  await prisma.repositoryConfig.upsert({
    where: { repoId: repo.id },
    update: {},
    create: {
      repoId: repo.id,
      config: {
        retentionDays: 30,
        scoringThreshold: 60,
      },
      retentionDays: 30,
      scoringThreshold: 60,
    },
  });

  console.log('✅ Created repository configuration');

  // Create a sample test case
  const testCase = await prisma.testCase.create({
    data: {
      repoId: repo.id,
      path: 'src/__tests__/example.test.ts',
      name: 'Example test case',
      framework: 'jest',
      tags: ['unit', 'example'],
      description: 'This is a sample test case for seeding',
    },
  });

  console.log('✅ Created sample test case:', testCase.name);

  // Create a sample test run
  await prisma.testRun.create({
    data: {
      testCaseId: testCase.id,
      repoId: repo.id,
      commitSha: 'a'.repeat(40), // Placeholder SHA
      status: 'pass',
      durationMs: 1250,
      startedAt: new Date(),
    },
  });

  console.log('✅ Created sample test run');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
