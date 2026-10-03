/* eslint-env node */
/* global require, process, console */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  try {
    // Get or create test repo
    let repo = await prisma.repo.findFirst({
      where: { name: 'rbac-test-repo', owner: 'test' },
    });

    if (!repo) {
      repo = await prisma.repo.create({
        data: {
          name: 'rbac-test-repo',
          owner: 'test',
          defaultBranch: 'main',
          visibility: 'public',
        },
      });
      console.log('Created test repository:', repo.id);
    } else {
      console.log('Using existing repository:', repo.id);
    }

    // Get user by email
    const email = process.argv[2] || 'rbac-test@example.com';
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      console.error('User not found:', email);
      process.exit(1);
    }

    const userId = user.id;
    console.log('Using user ID:', userId);

    // Check if role already exists
    const existingRole = await prisma.userRepoRole.findUnique({
      where: {
        userId_repoId: {
          userId: userId,
          repoId: repo.id,
        },
      },
    });

    if (existingRole) {
      console.log('Role already exists:', existingRole.role);
      console.log(JSON.stringify({ repoId: repo.id, userId: userId, role: existingRole.role }));
    } else {
      // Create admin role (bypassing permission check for first user)
      await prisma.userRepoRole.create({
        data: {
          userId: userId,
          repoId: repo.id,
          role: 'admin',
          assignedBy: userId, // Self-assigned for first admin
        },
      });

      // Create audit log
      await prisma.roleAuditLog.create({
        data: {
          actorId: userId,
          targetUserId: userId,
          repoId: repo.id,
          action: 'assigned',
          oldRole: null,
          newRole: 'admin',
        },
      });

      console.log('Created admin role');
      console.log(JSON.stringify({ repoId: repo.id, userId: userId, role: 'admin' }));
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setup();
