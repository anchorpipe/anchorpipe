import type { PrismaClient } from '@prisma/client';

export async function alreadyProcessed(prisma: PrismaClient, messageId: string): Promise<boolean> {
  const row = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS(SELECT 1 FROM processed_messages WHERE message_id = $1) as exists`,
    messageId
  );
  return Boolean(row?.[0]?.exists);
}

export async function markProcessed(prisma: PrismaClient, messageId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `INSERT INTO processed_messages (message_id, processed_at) VALUES ($1, NOW()) ON CONFLICT (message_id) DO NOTHING`,
    messageId
  );
}
