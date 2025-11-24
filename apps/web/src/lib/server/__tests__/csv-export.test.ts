import { describe, it, expect } from 'vitest';
import { convertDsrPayloadToCsv } from '../csv-export';
import type { DsrExportPayload } from '../dsr-service';

const createMockPayload = (overrides?: Partial<DsrExportPayload>): DsrExportPayload => ({
  user: {
    id: 'user-1',
    email: 'test@example.com',
    githubLogin: 'testuser',
    name: 'Test User',
    telemetryOptIn: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    preferences: {},
  },
  repoRoles: [],
  roleAuditLogs: [],
  ...overrides,
});

describe('csv-export', () => {
  describe('convertDsrPayloadToCsv', () => {
    it('converts basic user data to CSV', () => {
      const payload = createMockPayload();
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).toContain('Section,Field,Value');
      expect(csv).toContain('User,ID,user-1');
      expect(csv).toContain('User,Email,test@example.com');
      expect(csv).toContain('User,GitHub Login,testuser');
      expect(csv).toContain('User,Name,Test User');
      expect(csv).toContain('User,Telemetry Opt-In,true');
    });

    it('handles null values in user data', () => {
      const payload = createMockPayload({
        user: {
          id: 'user-1',
          email: null,
          githubLogin: null,
          name: null,
          telemetryOptIn: false,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          preferences: {},
        },
      });
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).toContain('User,Email,');
      expect(csv).toContain('User,GitHub Login,');
      expect(csv).toContain('User,Name,');
    });

    it('includes repository roles when present', () => {
      const payload = createMockPayload({
        repoRoles: [
          {
            repoId: 'repo-1',
            role: 'admin',
            assignedBy: 'admin-1',
            createdAt: new Date('2024-01-02T00:00:00.000Z'),
            repo: {
              id: 'repo-1',
              name: 'test-repo',
              owner: 'test-org',
            },
          },
        ],
      });
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).toContain('Repository Roles');
      expect(csv).toContain('Repository Role,repo-1,test-repo,test-org,admin,admin-1');
    });

    it('includes role audit logs when present', () => {
      const payload = createMockPayload({
        roleAuditLogs: [
          {
            actingAs: 'actor',
            repoId: 'repo-1',
            action: 'assigned',
            oldRole: null,
            newRole: 'admin',
            createdAt: new Date('2024-01-03T00:00:00.000Z'),
          },
        ],
      });
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).toContain('Role Audit Logs');
      expect(csv).toContain('Role Audit Log,actor,repo-1,assigned,,admin');
    });

    it('escapes CSV special characters', () => {
      const payload = createMockPayload({
        user: {
          id: 'user-1',
          email: 'test,with"commas@example.com',
          githubLogin: 'user\nwith\nnewlines',
          name: 'User "Quoted" Name',
          telemetryOptIn: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          preferences: {},
        },
      });
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).toContain('"test,with""commas@example.com"');
      expect(csv).toContain('"user\nwith\nnewlines"');
      expect(csv).toContain('"User ""Quoted"" Name"');
    });

    it('handles empty repo roles and audit logs', () => {
      const payload = createMockPayload({
        repoRoles: [],
        roleAuditLogs: [],
      });
      const csv = convertDsrPayloadToCsv(payload);

      expect(csv).not.toContain('Repository Roles');
      expect(csv).not.toContain('Role Audit Logs');
    });
  });
});

