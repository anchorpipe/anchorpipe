import { describe, expect, it, vi } from 'vitest';

vi.mock('@anchorpipe/database', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, meta: { code: string }) {
      super(message);
      this.code = meta.code;
    }
  }
  return { prisma: {}, Prisma: { PrismaClientKnownRequestError } };
});

import { Prisma } from '@anchorpipe/database';
import { NormalizationFailure, processOneOutboxEvent } from './worker';

type Row = Record<string, any>;

function matches(row: Row, where: Row): boolean {
  if (!where) return true;
  if (where.OR && !where.OR.some((condition: Row) => matches(row, condition))) return false;
  for (const [key, expected] of Object.entries(where)) {
    if (key === 'OR') continue;
    if (key.includes('_') && typeof expected === 'object' && !Array.isArray(expected)) {
      const [first, second, third] = key.split('_');
      if (row[first] !== expected[first] || row[second] !== expected[second] || (third && row[third] !== expected[third])) return false;
      continue;
    }
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('in' in expected && !expected.in.includes(row[key])) return false;
      if ('lte' in expected && !(row[key] && row[key] <= expected.lte)) return false;
      if ('lt' in expected && !(row[key] && row[key] < expected.lt)) return false;
      if ('gte' in expected && !(row[key] && row[key] >= expected.gte)) return false;
      if ('equals' in expected && row[key] !== expected.equals) return false;
      if (Object.keys(expected).length === 1 && 'in' in expected) continue;
      if (Object.keys(expected).length === 1 && 'lte' in expected) continue;
      if (Object.keys(expected).length === 1 && 'lt' in expected) continue;
      if (Object.keys(expected).length === 1 && 'gte' in expected) continue;
    }
    if (expected === null ? row[key] !== null : row[key] !== expected) return false;
  }
  return true;
}

function apply(row: Row, data: Row) {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in value) row[key] += value.increment;
    else row[key] = value;
  }
}

class FakePrisma {
  events: Row[] = [];
  ledgers: Row[] = [];
  receipts: Row[] = [{ id: 'receipt-1', status: 'accepted' }];
  deadLetters: Row[] = [];
  conflictOnCreate = false;

  outboxEvent = {
    findFirst: async (args: Row) => this.events.filter((row) => matches(row, args.where)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0] ?? null,
    update: async (args: Row) => {
      const row = this.events.find((item) => matches(item, args.where));
      if (!row) throw new Error('missing event');
      apply(row, args.data);
      return row;
    },
    updateMany: async (args: Row) => {
      const rows = this.events.filter((row) => matches(row, args.where));
      rows.forEach((row) => apply(row, args.data));
      return { count: rows.length };
    },
  };

  processingLedger = {
    findMany: async (args: Row) => this.ledgers.filter((row) => matches(row, args.where)),
    findUnique: async (args: Row) => this.ledgers.find((row) => matches(row, Object.values(args.where)[0] as Row)) ?? null,
    create: async (args: Row) => {
      if (this.conflictOnCreate) {
        throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });
      }
      const row = { id: `ledger-${this.ledgers.length + 1}`, ...args.data };
      this.ledgers.push(row);
      return row;
    },
    updateMany: async (args: Row) => {
      const rows = this.ledgers.filter((row) => matches(row, args.where));
      rows.forEach((row) => apply(row, args.data));
      return { count: rows.length };
    },
    update: async (args: Row) => {
      const row = this.ledgers.find((item) => matches(item, args.where));
      if (!row) throw new Error('missing ledger');
      apply(row, args.data);
      return row;
    },
  };

  ingestionReceipt = {
    update: async (args: Row) => {
      const row = this.receipts.find((item) => matches(item, args.where));
      if (!row) throw new Error('missing receipt');
      apply(row, args.data);
      return row;
    },
  };

  deadLetter = {
    upsert: async (args: Row) => {
      const existing = this.deadLetters.find((row) => row.receiptId === args.where.receiptId_consumer.receiptId && row.consumer === args.where.receiptId_consumer.consumer);
      if (existing) apply(existing, args.update);
      else this.deadLetters.push({ id: `dead-${this.deadLetters.length + 1}`, ...args.create });
    },
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

function event(): Row {
  return {
    id: 'event-1', tenantId: 'tenant-1', receiptId: 'receipt-1', eventType: 'receipt.accepted', eventVersion: 1,
    payload: { value: 1 }, status: 'pending', availableAt: new Date('2026-01-01T00:00:00Z'), attempts: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'), lastError: null,
  };
}

const now = () => new Date('2026-01-01T00:00:00Z');

it('does not process when another worker wins the unique ledger claim', async () => {
  const db = new FakePrisma();
  db.events = [event()];
  db.conflictOnCreate = true;
  const normalize = vi.fn();

  await expect(processOneOutboxEvent({ db: db as any, normalizer: { normalize }, now })).resolves.toBe(true);
  expect(normalize).not.toHaveBeenCalled();
});

describe('worker failure handling', () => {
  it('moves a retryable failure to retryable with bounded backoff', async () => {
    const db = new FakePrisma();
    db.events = [event()];
    const normalize = vi.fn().mockRejectedValue(new NormalizationFailure('temporary', true, 'TEMPORARY'));

    await processOneOutboxEvent({ db: db as any, normalizer: { normalize }, now, backoffBaseMs: 100, backoffMaxMs: 500, maxAttempts: 3 });

    expect(db.ledgers[0]).toMatchObject({ status: 'retryable', attempts: 1, lastError: 'TEMPORARY' });
    expect(db.events[0]).toMatchObject({ status: 'failed', lastError: 'TEMPORARY' });
    expect(db.events[0].availableAt).toEqual(new Date('2026-01-01T00:00:00.100Z'));
  });

  it('recovers a stale lease into retryable state without taking it twice', async () => {
    const db = new FakePrisma();
    db.events = [event()];
    db.ledgers = [{ id: 'ledger-1', tenantId: 'tenant-1', receiptId: 'receipt-1', status: 'processing', attempts: 1, leaseUntil: new Date('2025-12-31T23:59:00Z'), nextAttemptAt: null, lastError: null }];
    const normalize = vi.fn();

    await processOneOutboxEvent({ db: db as any, normalizer: { normalize }, now, backoffBaseMs: 100, backoffMaxMs: 500 });

    expect(db.ledgers[0]).toMatchObject({ status: 'retryable', leaseUntil: null, lastError: 'LEASE_EXPIRED' });
    expect(db.events[0]).toMatchObject({ status: 'failed', lastError: 'LEASE_EXPIRED' });
    expect(normalize).not.toHaveBeenCalled();
  });

  it('quarantines and records a non-retryable failure in the dead-letter table', async () => {
    const db = new FakePrisma();
    db.events = [event()];
    const normalize = vi.fn().mockRejectedValue(new NormalizationFailure('bad payload', false, 'BAD_PAYLOAD'));

    await processOneOutboxEvent({ db: db as any, normalizer: { normalize }, now, maxAttempts: 3 });

    expect(db.ledgers[0]).toMatchObject({ status: 'dead_letter', attempts: 1, lastError: 'BAD_PAYLOAD' });
    expect(db.receipts[0].status).toBe('quarantined');
    expect(db.events[0]).toMatchObject({ status: 'failed', lastError: 'BAD_PAYLOAD' });
    expect(db.deadLetters[0]).toMatchObject({ reasonCode: 'BAD_PAYLOAD', attempts: 1 });
  });
});
