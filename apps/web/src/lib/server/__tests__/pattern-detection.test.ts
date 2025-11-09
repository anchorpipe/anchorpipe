/**
 * Pattern Detection Tests
 *
 * Unit tests for pattern detection service.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { describe, expect, it, vi } from 'vitest';
import {
  detectMultipleFailedLogins,
  detectMultipleFailedHmacAuth,
  detectRapidRoleChanges,
  detectTokenAbuse,
  SuspiciousPatternType,
} from '../pattern-detection';

// Mock Prisma
vi.mock('@anchorpipe/database', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Pattern Detection', () => {
  let prismaMock: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import('@anchorpipe/database');
    prismaMock = prisma as any;
  });

  describe('detectMultipleFailedLogins', () => {
    it('should detect multiple failed logins from same IP', async () => {
      const mockLogs = Array.from({ length: 15 }, (_, i) => ({
        ipAddress: '192.168.1.1',
        actorId: null,
        createdAt: new Date(Date.now() - i * 1000),
        metadata: {},
      }));

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const patterns = await detectMultipleFailedLogins({
        failedLoginThreshold: 10,
        failedLoginWindowMs: 15 * 60 * 1000,
        bruteForceThreshold: 20,
        bruteForceWindowMs: 30 * 60 * 1000,
        hmacFailureThreshold: 10,
        hmacFailureWindowMs: 15 * 60 * 1000,
        roleChangeThreshold: 5,
        roleChangeWindowMs: 60 * 60 * 1000,
        tokenRevocationThreshold: 10,
        tokenRevocationWindowMs: 60 * 60 * 1000,
      });

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe(SuspiciousPatternType.MultipleFailedLogins);
      expect(patterns[0].count).toBe(15);
      expect(patterns[0].severity).toBe('medium');
    });

    it('should not detect pattern below threshold', async () => {
      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        ipAddress: '192.168.1.1',
        actorId: null,
        createdAt: new Date(Date.now() - i * 1000),
        metadata: {},
      }));

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const patterns = await detectMultipleFailedLogins({
        failedLoginThreshold: 10,
        failedLoginWindowMs: 15 * 60 * 1000,
        bruteForceThreshold: 20,
        bruteForceWindowMs: 30 * 60 * 1000,
        hmacFailureThreshold: 10,
        hmacFailureWindowMs: 15 * 60 * 1000,
        roleChangeThreshold: 5,
        roleChangeWindowMs: 60 * 60 * 1000,
        tokenRevocationThreshold: 10,
        tokenRevocationWindowMs: 60 * 60 * 1000,
      });

      expect(patterns).toHaveLength(0);
    });
  });

  describe('detectMultipleFailedHmacAuth', () => {
    it('should detect multiple failed HMAC auth attempts', async () => {
      const mockLogs = Array.from({ length: 12 }, (_, i) => ({
        subjectId: 'repo-123',
        ipAddress: '192.168.1.1',
        createdAt: new Date(Date.now() - i * 1000),
        metadata: {},
      }));

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const patterns = await detectMultipleFailedHmacAuth({
        failedLoginThreshold: 10,
        failedLoginWindowMs: 15 * 60 * 1000,
        bruteForceThreshold: 20,
        bruteForceWindowMs: 30 * 60 * 1000,
        hmacFailureThreshold: 10,
        hmacFailureWindowMs: 15 * 60 * 1000,
        roleChangeThreshold: 5,
        roleChangeWindowMs: 60 * 60 * 1000,
        tokenRevocationThreshold: 10,
        tokenRevocationWindowMs: 60 * 60 * 1000,
      });

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe(SuspiciousPatternType.MultipleFailedHmacAuth);
      expect(patterns[0].count).toBe(12);
      expect(patterns[0].severity).toBe('high');
    });
  });

  describe('detectRapidRoleChanges', () => {
    it('should detect rapid role changes', async () => {
      const mockLogs = Array.from({ length: 6 }, (_, i) => ({
        subjectId: 'repo-123',
        actorId: 'user-456',
        action: i % 2 === 0 ? 'role_assigned' : 'role_removed',
        createdAt: new Date(Date.now() - i * 1000),
        metadata: {},
      }));

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const patterns = await detectRapidRoleChanges({
        failedLoginThreshold: 10,
        failedLoginWindowMs: 15 * 60 * 1000,
        bruteForceThreshold: 20,
        bruteForceWindowMs: 30 * 60 * 1000,
        hmacFailureThreshold: 10,
        hmacFailureWindowMs: 15 * 60 * 1000,
        roleChangeThreshold: 5,
        roleChangeWindowMs: 60 * 60 * 1000,
        tokenRevocationThreshold: 10,
        tokenRevocationWindowMs: 60 * 60 * 1000,
      });

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe(SuspiciousPatternType.RapidRoleChanges);
      expect(patterns[0].count).toBe(6);
    });
  });

  describe('detectTokenAbuse', () => {
    it('should detect token abuse patterns', async () => {
      const mockLogs = Array.from({ length: 15 }, (_, i) => ({
        subjectId: 'token-123',
        actorId: 'user-456',
        createdAt: new Date(Date.now() - i * 1000),
        metadata: {},
      }));

      prismaMock.auditLog.findMany.mockResolvedValue(mockLogs);

      const patterns = await detectTokenAbuse({
        failedLoginThreshold: 10,
        failedLoginWindowMs: 15 * 60 * 1000,
        bruteForceThreshold: 20,
        bruteForceWindowMs: 30 * 60 * 1000,
        hmacFailureThreshold: 10,
        hmacFailureWindowMs: 15 * 60 * 1000,
        roleChangeThreshold: 5,
        roleChangeWindowMs: 60 * 60 * 1000,
        tokenRevocationThreshold: 10,
        tokenRevocationWindowMs: 60 * 60 * 1000,
      });

      expect(patterns).toHaveLength(1);
      expect(patterns[0].type).toBe(SuspiciousPatternType.TokenAbuse);
      expect(patterns[0].count).toBe(15);
    });
  });
});
