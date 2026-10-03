#!/usr/bin/env ts-node
/**
 * DLQ Management CLI Utility
 *
 * Allows CLI operators to list, inspect, quarantine, and replay dead-lettered ingestion events.
 */

import { prisma } from '@anchorpipe/database';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';

  switch (command) {
    case 'list': {
      const deadLetters = await prisma.deadLetter.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      console.log(`Found ${deadLetters.length} dead letters:`);
      console.table(
        deadLetters.map((dl) => ({
          id: dl.id,
          tenantId: dl.tenantId,
          receiptId: dl.receiptId,
          reasonCode: dl.reasonCode,
          attempts: dl.attempts,
          createdAt: dl.createdAt.toISOString(),
        }))
      );
      break;
    }

    case 'replay': {
      const id = args[1];
      if (!id) {
        console.error('Error: Please provide a dead letter ID to replay.');
        process.exit(1);
      }

      const deadLetter = await prisma.deadLetter.findUnique({
        where: { id },
      });

      if (!deadLetter) {
        console.error(`Error: Dead letter with ID "${id}" not found.`);
        process.exit(1);
      }

      const replayed = await prisma.$transaction(async (tx) => {
        const outbox = await tx.outboxEvent.create({
          data: {
            tenantId: deadLetter.tenantId,
            receiptId: deadLetter.receiptId,
            eventType: 'ingestion.replayed',
            eventVersion: 1,
            payload: {
              receiptId: deadLetter.receiptId,
              deadLetterId: deadLetter.id,
              reasonCode: deadLetter.reasonCode,
              replayedBy: 'cli-operator',
            },
          },
        });

        await tx.deadLetter.delete({
          where: { id: deadLetter.id },
        });

        return outbox;
      });

      console.log(`Successfully replayed dead letter ${id}. Created Outbox Event ID: ${replayed.id}`);
      break;
    }

    case 'purge': {
      const count = await prisma.deadLetter.deleteMany({});
      console.log(`Purged ${count.count} dead letters.`);
      break;
    }

    default:
      console.log('Usage: npx ts-node scripts/dlq-manage.ts [list|replay <id>|purge]');
  }
}

main()
  .catch((e) => {
    console.error('DLQ CLI error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
