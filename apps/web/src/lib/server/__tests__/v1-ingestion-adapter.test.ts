import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@anchorpipe/database';
import type { AcceptIngestionCommand } from '@anchorpipe/ingestion';
import {
  PostgresIngestionReceiptPort,
  ReceiptPersistenceError,
} from '../v1-ingestion-adapter';

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  ingestionReceipt: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
  Prisma: {
    PrismaClientKnownRequestError: class MockPrismaClientKnownRequestError extends Error {
      code = 'P2002';
    },
  },
}));

vi.mock('@anchorpipe/storage', () => ({
  createMinioClient: vi.fn(),
  uploadFile: vi.fn(),
}));

type ReceiptRecord = {
  id: string;
  requestHash: string;
};

type Store = {
  receipts: Map<string, ReceiptRecord>;
  idempotencyKeys: Map<string, string>;
  outboxEvents: Map<string, string>;
  repos: Map<string, string>;
};

type MockedPrismaMethod<T extends (...args: any[]) => any> = ReturnType<
  typeof vi.fn<(...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>>
>;

type TransactionMock = Pick<
  {
    ingestionReceipt: {
      findUnique: MockedPrismaMethod<Prisma.TransactionClient['ingestionReceipt']['findUnique']>;
      create: MockedPrismaMethod<Prisma.TransactionClient['ingestionReceipt']['create']>;
    };
    idempotencyKey: {
      create: MockedPrismaMethod<Prisma.TransactionClient['idempotencyKey']['create']>;
    };
    outboxEvent: {
      create: MockedPrismaMethod<Prisma.TransactionClient['outboxEvent']['create']>;
    };
    repo: {
      findFirst: MockedPrismaMethod<Prisma.TransactionClient['repo']['findFirst']>;
    };
  },
  'ingestionReceipt' | 'idempotencyKey' | 'outboxEvent' | 'repo'
>;

type FailurePoint = 'outbox' | undefined;

let store: Store;
let nextReceiptId: number;
let failurePoint: FailurePoint;
let transactionQueue: Promise<void>;

function emptyStore(): Store {
  return {
    receipts: new Map(),
    idempotencyKeys: new Map(),
    outboxEvents: new Map(),
    repos: new Map(),
  };
}

function cloneStore(source: Store): Store {
  return {
    receipts: new Map(source.receipts),
    idempotencyKeys: new Map(source.idempotencyKeys),
    outboxEvents: new Map(source.outboxEvents),
    repos: new Map(source.repos),
  };
}

function createTransaction(draft: Store): Prisma.TransactionClient {
  const transaction: TransactionMock = {
    ingestionReceipt: {
      findUnique: vi.fn<(...args: Parameters<Prisma.TransactionClient['ingestionReceipt']['findUnique']>) => Promise<Awaited<ReturnType<Prisma.TransactionClient['ingestionReceipt']['findUnique']>>>>(),
      create: vi.fn<(...args: Parameters<Prisma.TransactionClient['ingestionReceipt']['create']>) => Promise<Awaited<ReturnType<Prisma.TransactionClient['ingestionReceipt']['create']>>>>(),
    },
    idempotencyKey: {
      create: vi.fn<(...args: Parameters<Prisma.TransactionClient['idempotencyKey']['create']>) => Promise<Awaited<ReturnType<Prisma.TransactionClient['idempotencyKey']['create']>>>>(),
    },
    outboxEvent: {
      create: vi.fn<(...args: Parameters<Prisma.TransactionClient['outboxEvent']['create']>) => Promise<Awaited<ReturnType<Prisma.TransactionClient['outboxEvent']['create']>>>>(),
    },
    repo: {
      findFirst: vi.fn<(...args: Parameters<Prisma.TransactionClient['repo']['findFirst']>) => Promise<Awaited<ReturnType<Prisma.TransactionClient['repo']['findFirst']>>>>(),
    },
  };

  transaction.ingestionReceipt.findUnique.mockImplementation(async (args: any) => {
    const key = args.where.tenantId_clientKey;
    const record = draft.receipts.get(`${key.tenantId}:${key.clientKey}`);
    return (record ? { id: record.id, requestHash: record.requestHash } : null) as any;
  });

  transaction.repo.findFirst.mockImplementation(async (args: any) => {
    const repoId = args.where.id;
    const tenantId = args.where.tenantId;
    return draft.repos.get(repoId) === tenantId ? ({ id: repoId } as any) : null;
  });

  transaction.ingestionReceipt.create.mockImplementation(async (args: any) => {
    const id = `receipt-${nextReceiptId++}`;
    const key = args.data.tenantId && args.data.clientKey
      ? `${args.data.tenantId}:${args.data.clientKey}`
      : undefined;
    if (!key) {
      throw new Error('The transaction mock requires tenant and client key data.');
    }
    draft.receipts.set(key, { id, requestHash: args.data.requestHash });
    return { id } as any;
  });

  transaction.idempotencyKey.create.mockImplementation(async (args: any) => {
    draft.idempotencyKeys.set(args.data.key, args.data.receiptId);
    return {} as any;
  });

  transaction.outboxEvent.create.mockImplementation(async (args: any) => {
    if (failurePoint === 'outbox') {
      throw new Error('simulated outbox write failure');
    }
    draft.outboxEvents.set(`${args.data.tenantId}:${args.data.receiptId}`, args.data.eventType);
    return {} as any;
  });

  return transaction as unknown as Prisma.TransactionClient;
}

function installTransactionMock(): void {
  mockPrisma.$transaction.mockImplementation(
    (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
      // Serialize callbacks like a database connection queue, while committing only
      // after the callback succeeds. This makes concurrent replay and rollback behavior
      // explicit without requiring an external PostgreSQL service.
      const run = transactionQueue.then(async () => {
        const draft = cloneStore(store);
        const result = await callback(createTransaction(draft));
        store = draft;
        return result;
      });
      transactionQueue = run.then(
        () => undefined,
        () => undefined
      );
      return run;
    }
  );

  mockPrisma.ingestionReceipt.findUnique.mockImplementation(async (args) => {
    const key = args.where.tenantId_clientKey;
    const record = store.receipts.get(`${key.tenantId}:${key.clientKey}`);
    return record ? { id: record.id, requestHash: record.requestHash } : null;
  });
}

function command(overrides: Partial<AcceptIngestionCommand> = {}): AcceptIngestionCommand {
  return {
    context: {
      tenantId: 'tenant-a',
      repoId: 'repo-a',
      credentialId: 'credential-a',
    },
    clientKey: 'client-key-1',
    requestHash: 'hash-a',
    objectKey: 'tenant-a/object-1.json',
    envelope: {
      eventId: 'event-1',
      schemaVersion: 'test-report.v1',
      source: 'github-actions',
      occurredAt: '2026-01-01T00:00:00.000Z',
      run: {
        providerRunId: 'run-1',
        attempt: 1,
        commitSha: 'a'.repeat(40),
        ref: 'refs/heads/main',
        framework: 'vitest',
      },
      content: {
        mediaType: 'application/json',
        sizeBytes: 42,
      },
    },
    ...overrides,
  };
}

describe('PostgresIngestionReceiptPort transaction behavior', () => {
  const port = new PostgresIngestionReceiptPort();

  beforeEach(() => {
    vi.clearAllMocks();
    store = emptyStore();
    nextReceiptId = 1;
    failurePoint = undefined;
    transactionQueue = Promise.resolve();
    store.repos.set('repo-a', 'tenant-a');
    installTransactionMock();
  });

  it('returns the same receipt for concurrent identical replay', async () => {
    const request = command();

    const [first, replay] = await Promise.all([port.accept(request), port.accept(request)]);

    expect(first).toEqual({
      ingestionId: 'receipt-1',
      state: 'accepted',
      statusUrl: '/api/v1/ingestions/receipt-1',
      duplicate: false,
    });
    expect(replay).toEqual({
      ingestionId: 'receipt-1',
      state: 'accepted',
      statusUrl: '/api/v1/ingestions/receipt-1',
      duplicate: true,
    });
    expect(store.receipts).toHaveLength(1);
    expect(store.idempotencyKeys).toHaveLength(1);
    expect(store.outboxEvents).toHaveLength(1);
  });

  it('returns 409 when the same tenant/client key is reused with a changed hash', async () => {
    const request = command();
    await port.accept(request);

    const conflict = port.accept(command({ requestHash: 'hash-b' }));

    await expect(conflict).rejects.toMatchObject({
      code: 'IDEMPOTENCY_CONFLICT',
      httpStatus: 409,
    });
    expect(store.receipts).toHaveLength(1);
    expect(store.idempotencyKeys).toHaveLength(1);
    expect(store.outboxEvents).toHaveLength(1);
  });

  it('rejects a repository owned by another tenant with 403', async () => {
    const request = command({
      context: {
        tenantId: 'tenant-b',
        repoId: 'repo-a',
        credentialId: 'credential-b',
      },
    });

    await expect(port.accept(request)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      httpStatus: 403,
    });
    expect(store.receipts).toHaveLength(0);
    expect(store.idempotencyKeys).toHaveLength(0);
    expect(store.outboxEvents).toHaveLength(0);
  });

  it('rolls back receipt, idempotency, and outbox writes as one transaction', async () => {
    failurePoint = 'outbox';

    await expect(port.accept(command())).rejects.toBeInstanceOf(ReceiptPersistenceError);
    expect(store.receipts).toHaveLength(0);
    expect(store.idempotencyKeys).toHaveLength(0);
    expect(store.outboxEvents).toHaveLength(0);

    failurePoint = undefined;
    await expect(port.accept(command())).resolves.toMatchObject({
      ingestionId: 'receipt-2',
      duplicate: false,
    });
    expect(store.receipts).toHaveLength(1);
    expect(store.idempotencyKeys).toHaveLength(1);
    expect(store.outboxEvents).toHaveLength(1);
  });
});
