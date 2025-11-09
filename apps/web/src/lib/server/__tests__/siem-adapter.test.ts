/**
 * SIEM Adapter Tests
 *
 * Unit tests for SIEM adapter interface and utilities.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import {
  convertAuditLogToSiemEntry,
  formatAsCEF,
  formatAsLEEF,
  SiemLogEntry,
} from '../siem-adapter';

describe('SIEM Adapter', () => {
  describe('convertAuditLogToSiemEntry', () => {
    it('should convert audit log to SIEM entry', () => {
      const auditLog = {
        id: 'test-id',
        action: 'login_success',
        subject: 'user',
        subjectId: 'user-123',
        actorId: 'actor-456',
        description: 'User logged in successfully',
        metadata: { ip: '192.168.1.1' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        actor: {
          email: 'user@example.com',
        },
      };

      const result = convertAuditLogToSiemEntry(auditLog);

      expect(result).toEqual({
        id: 'test-id',
        timestamp: '2025-01-01T00:00:00.000Z',
        action: 'login_success',
        subject: 'user',
        subjectId: 'user-123',
        actorId: 'actor-456',
        actorEmail: 'user@example.com',
        description: 'User logged in successfully',
        metadata: { ip: '192.168.1.1' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        severity: 'info',
      });
    });

    it('should handle null values', () => {
      const auditLog = {
        id: 'test-id',
        action: 'login_failure',
        subject: 'user',
        subjectId: null,
        actorId: null,
        description: null,
        metadata: null,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        actor: null,
      };

      const result = convertAuditLogToSiemEntry(auditLog);

      expect(result.subjectId).toBeUndefined();
      expect(result.actorId).toBeUndefined();
      expect(result.actorEmail).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.metadata).toBeUndefined();
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
    });

    it('should set severity based on action', () => {
      const failureLog = {
        id: 'test-1',
        action: 'login_failure',
        subject: 'user',
        createdAt: new Date(),
        actor: null,
      };
      expect(convertAuditLogToSiemEntry(failureLog).severity).toBe('error');

      const revokedLog = {
        id: 'test-2',
        action: 'token_revoked',
        subject: 'token',
        createdAt: new Date(),
        actor: null,
      };
      expect(convertAuditLogToSiemEntry(revokedLog).severity).toBe('error');

      const configLog = {
        id: 'test-3',
        action: 'config_updated',
        subject: 'configuration',
        createdAt: new Date(),
        actor: null,
      };
      expect(convertAuditLogToSiemEntry(configLog).severity).toBe('warning');

      const successLog = {
        id: 'test-4',
        action: 'login_success',
        subject: 'user',
        createdAt: new Date(),
        actor: null,
      };
      expect(convertAuditLogToSiemEntry(successLog).severity).toBe('info');
    });
  });

  describe('formatAsCEF', () => {
    it('should format log entry as CEF', () => {
      const entry: SiemLogEntry = {
        id: 'test-id',
        timestamp: '2025-01-01T00:00:00.000Z',
        action: 'login_success',
        subject: 'user',
        actorId: 'actor-123',
        actorEmail: 'user@example.com',
        ipAddress: '192.168.1.1',
        subjectId: 'user-456',
        metadata: { test: 'value' },
        severity: 'info',
      };

      const cef = formatAsCEF(entry);

      expect(cef).toContain('CEF:0|Anchorpipe|Anchorpipe|1.0|login_success');
      expect(cef).toContain('suser=actor-123');
      expect(cef).toContain('src=192.168.1.1');
      expect(cef).toContain('dhost=user-456');
    });

    it('should escape CEF special characters', () => {
      const entry: SiemLogEntry = {
        id: 'test-id',
        timestamp: '2025-01-01T00:00:00.000Z',
        action: 'test',
        subject: 'system',
        actorId: 'user=test\\value',
        severity: 'info',
      };

      const cef = formatAsCEF(entry);

      expect(cef).toContain('suser=user\\=test\\\\value');
    });
  });

  describe('formatAsLEEF', () => {
    it('should format log entry as LEEF', () => {
      const entry: SiemLogEntry = {
        id: 'test-id',
        timestamp: '2025-01-01T00:00:00.000Z',
        action: 'login_success',
        subject: 'user',
        actorId: 'actor-123',
        actorEmail: 'user@example.com',
        ipAddress: '192.168.1.1',
        subjectId: 'user-456',
        metadata: { test: 'value' },
        severity: 'info',
      };

      const leef = formatAsLEEF(entry);

      expect(leef).toContain('LEEF:2.0|Anchorpipe|Anchorpipe|1.0|login_success');
      expect(leef).toContain('usrName=actor-123');
      expect(leef).toContain('usrEmail=user@example.com');
      expect(leef).toContain('src=192.168.1.1');
      expect(leef).toContain('dst=user-456');
    });

    it('should include severity in LEEF format', () => {
      const entry: SiemLogEntry = {
        id: 'test-id',
        timestamp: '2025-01-01T00:00:00.000Z',
        action: 'test',
        subject: 'system',
        severity: 'error',
      };

      const leef = formatAsLEEF(entry);

      expect(leef).toContain('sev=2'); // error = 2 in LEEF
    });
  });
});
