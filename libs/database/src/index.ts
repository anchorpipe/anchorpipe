/**
 * anchorpipe Database Client
 *
 * Exports the Prisma client instance and database connection utilities.
 *
 * @module @anchorpipe/database
 */

import { PrismaClient } from '@prisma/client';

// PrismaClient singleton pattern for Next.js
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Database health check
 * Returns true if database connection is healthy
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

export * from '@prisma/client';
