import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateHmacSecret,
  createHmacSecret,
  rotateHmacSecret,
  revokeHmacSecret,
  findActiveSecretsForRepo,
  updateSecretLastUsed,
  listHmacSecrets,
  getHmacSecretById,
} from '../hmac-secrets';
import { prisma } from '@anchorpipe/database';
import { encryptField } from '../secrets';

// Mock Prisma client
vi.mock('@anchorpipe/database', () => ({
  prisma: {
    hmacSecret: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock secrets module
vi.mock('../secrets', () => ({
  encryptField: vi.fn((value: string) => `encrypted:${value}`),
  decryptField: vi.fn((value: string) => value?.replace('encrypted:', '') || null),
}));

describe('HMAC Secrets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateHmacSecret', () => {
    it('should generate a base64-encoded secret', () => {
      const secret = generateHmacSecret();
      expect(secret).toBeTruthy();
      expect(typeof secret).toBe('string');
      // Base64 encoded 32 bytes should be 44 characters (with padding)
      expect(secret.length).toBeGreaterThan(40);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateHmacSecret();
      const secret2 = generateHmacSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('createHmacSecret', () => {
    it('should create a new HMAC secret', async () => {
      const mockSecret = {
        id: 'secret-id',
        name: 'Test Secret',
        createdAt: new Date(),
      };

      (prisma.hmacSecret.create as any).mockResolvedValue(mockSecret);

      const result = await createHmacSecret({
        repoId: 'repo-id',
        name: 'Test Secret',
        secret: 'test-secret',
      });

      expect(result).toHaveProperty('id', 'secret-id');
      expect(result).toHaveProperty('name', 'Test Secret');
      expect(result).toHaveProperty('secret', 'test-secret');
      expect(encryptField).toHaveBeenCalledWith('test-secret');
      expect(prisma.hmacSecret.create).toHaveBeenCalled();
    });

    it('should include createdBy and expiresAt when provided', async () => {
      const mockSecret = {
        id: 'secret-id',
        name: 'Test Secret',
        createdAt: new Date(),
      };

      (prisma.hmacSecret.create as any).mockResolvedValue(mockSecret);
      const expiresAt = new Date('2025-12-31');

      await createHmacSecret({
        repoId: 'repo-id',
        name: 'Test Secret',
        secret: 'test-secret',
        createdBy: 'user-id',
        expiresAt,
      });

      expect(prisma.hmacSecret.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdBy: 'user-id',
            expiresAt,
          }),
        })
      );
    });

    it('should throw error if encryption fails', async () => {
      (encryptField as any).mockReturnValueOnce(null);

      await expect(
        createHmacSecret({
          repoId: 'repo-id',
          name: 'Test Secret',
          secret: 'test-secret',
        })
      ).rejects.toThrow('Failed to encrypt secret');
    });
  });

  describe('rotateHmacSecret', () => {
    it('should create new secret and revoke old one', async () => {
      const oldSecretId = 'old-secret-id';
      const newSecret = {
        id: 'new-secret-id',
        name: 'Rotated Secret',
        secret: 'new-secret',
        createdAt: new Date(),
      };

      (prisma.hmacSecret.create as any).mockResolvedValue(newSecret);
      (prisma.hmacSecret.update as any).mockResolvedValue({});

      const result = await rotateHmacSecret({
        oldSecretId,
        repoId: 'repo-id',
        name: 'Rotated Secret',
      });

      expect(result).toHaveProperty('id', 'new-secret-id');
      expect(prisma.hmacSecret.update).toHaveBeenCalledTimes(2);
      // First update: revoke old secret
      expect(prisma.hmacSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: oldSecretId },
          data: expect.objectContaining({
            revoked: true,
            active: false,
          }),
        })
      );
      // Second update: set rotation reference
      expect(prisma.hmacSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'new-secret-id' },
          data: expect.objectContaining({
            rotatedFrom: oldSecretId,
          }),
        })
      );
    });
  });

  describe('revokeHmacSecret', () => {
    it('should revoke a secret', async () => {
      const secretId = 'secret-id';
      (prisma.hmacSecret.update as any).mockResolvedValue({});

      await revokeHmacSecret(secretId);

      expect(prisma.hmacSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: secretId },
          data: expect.objectContaining({
            revoked: true,
            revokedAt: expect.any(Date),
            active: false,
          }),
        })
      );
    });
  });

  describe('findActiveSecretsForRepo', () => {
    it('should find active secrets for a repository', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          secretHash: 'hash-1',
          secretValue: 'encrypted:secret-1',
        },
        {
          id: 'secret-2',
          secretHash: 'hash-2',
          secretValue: 'encrypted:secret-2',
        },
      ];

      (prisma.hmacSecret.findMany as any).mockResolvedValue(mockSecrets);

      const result = await findActiveSecretsForRepo('repo-id');

      expect(result).toHaveLength(2);
      expect(prisma.hmacSecret.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            repoId: 'repo-id',
            active: true,
            revoked: false,
          }),
        })
      );
    });

    it('should filter out expired secrets', async () => {
      (prisma.hmacSecret.findMany as any).mockResolvedValue([]);

      await findActiveSecretsForRepo('repo-id');

      expect(prisma.hmacSecret.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
          }),
        })
      );
    });
  });

  describe('updateSecretLastUsed', () => {
    it('should update last used timestamp', async () => {
      const secretId = 'secret-id';
      (prisma.hmacSecret.update as any).mockResolvedValue({});

      await updateSecretLastUsed(secretId);

      expect(prisma.hmacSecret.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: secretId },
          data: expect.objectContaining({
            lastUsedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('listHmacSecrets', () => {
    it('should list all secrets for a repository', async () => {
      const mockSecrets = [
        {
          id: 'secret-1',
          name: 'Secret 1',
          active: true,
          revoked: false,
          lastUsedAt: new Date(),
          createdAt: new Date(),
          revokedAt: null,
          expiresAt: null,
          rotatedFrom: null,
        },
      ];

      (prisma.hmacSecret.findMany as any).mockResolvedValue(mockSecrets);

      const result = await listHmacSecrets('repo-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'secret-1');
      expect(prisma.hmacSecret.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { repoId: 'repo-id' },
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  describe('getHmacSecretById', () => {
    it('should get secret by ID', async () => {
      const mockSecret = {
        id: 'secret-id',
        repoId: 'repo-id',
        name: 'Test Secret',
        active: true,
        revoked: false,
        lastUsedAt: null,
        createdAt: new Date(),
        revokedAt: null,
        expiresAt: null,
        rotatedFrom: null,
      };

      (prisma.hmacSecret.findUnique as any).mockResolvedValue(mockSecret);

      const result = await getHmacSecretById('secret-id');

      expect(result).toHaveProperty('id', 'secret-id');
      expect(result).toHaveProperty('repoId', 'repo-id');
      expect(prisma.hmacSecret.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'secret-id' },
        })
      );
    });

    it('should return null if secret not found', async () => {
      (prisma.hmacSecret.findUnique as any).mockResolvedValue(null);

      const result = await getHmacSecretById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
