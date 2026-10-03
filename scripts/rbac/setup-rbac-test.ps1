# Setup RBAC Test Environment
# Creates a test repository and assigns admin role to a user

param(
    [string]$UserId = "",
    [string]$Email = "rbac-test@example.com"
)

$ErrorActionPreference = "Stop"

Write-Host "=== RBAC Test Setup ===" -ForegroundColor Cyan
Write-Host ""

# Import Prisma client (we'll use a Node.js script for this)
$setupScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
  try {
    // Get or create test repo
    let repo = await prisma.repo.findFirst({
      where: { name: 'rbac-test-repo', owner: 'test' }
    });

    if (!repo) {
      repo = await prisma.repo.create({
        data: {
          name: 'rbac-test-repo',
          owner: 'test',
          defaultBranch: 'main',
          visibility: 'public',
        }
      });
      console.log('Created test repository:', repo.id);
    } else {
      console.log('Using existing repository:', repo.id);
    }

    // Get user by email
    const user = await prisma.user.findFirst({
      where: { email: '$Email' }
    });

    if (!user) {
      console.error('User not found:', '$Email');
      process.exit(1);
    }

    const userId = '$UserId' || user.id;
    console.log('Using user ID:', userId);

    // Check if role already exists
    const existingRole = await prisma.userRepoRole.findUnique({
      where: {
        userId_repoId: {
          userId: userId,
          repoId: repo.id
        }
      }
    });

    if (existingRole) {
      console.log('Role already exists:', existingRole.role);
      console.log(JSON.stringify({ repoId: repo.id, userId: userId, role: existingRole.role }));
    } else {
      // Create admin role (bypassing permission check for first user)
      const role = await prisma.userRepoRole.create({
        data: {
          userId: userId,
          repoId: repo.id,
          role: 'admin',
          assignedBy: userId, // Self-assigned for first admin
        }
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
        }
      });

      console.log('Created admin role');
      console.log(JSON.stringify({ repoId: repo.id, userId: userId, role: 'admin' }));
    }

    await prisma.`$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setup();
"@

$setupScript | Out-File -FilePath "temp-setup-rbac.js" -Encoding UTF8

Write-Host "Running setup script..." -ForegroundColor Yellow
node temp-setup-rbac.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Setup complete!" -ForegroundColor Green
} else {
    Write-Host "✗ Setup failed" -ForegroundColor Red
    exit 1
}

Remove-Item temp-setup-rbac.js -ErrorAction SilentlyContinue

