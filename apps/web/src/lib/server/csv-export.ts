/**
 * CSV Export Utilities
 *
 * Converts DSR export payload to CSV format.
 *
 * Story: ST-205 (Medium Priority Gap)
 */

import { DsrExportPayload } from './dsr-service';

/**
 * Convert DSR export payload to CSV format
 */
export function convertDsrPayloadToCsv(payload: DsrExportPayload): string {
  const rows: string[][] = [];

  // Helper to escape CSV values
  const escapeCsv = (value: unknown): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // User Information
  rows.push(['Section', 'Field', 'Value']);
  rows.push(['User', 'ID', escapeCsv(payload.user.id)]);
  rows.push(['User', 'Email', escapeCsv(payload.user.email)]);
  rows.push(['User', 'GitHub Login', escapeCsv(payload.user.githubLogin)]);
  rows.push(['User', 'Name', escapeCsv(payload.user.name)]);
  rows.push(['User', 'Telemetry Opt-In', escapeCsv(payload.user.telemetryOptIn)]);
  rows.push(['User', 'Created At', escapeCsv(payload.user.createdAt)]);

  // Repository Roles
  if (payload.repoRoles.length > 0) {
    rows.push([]); // Empty row separator
    rows.push([
      'Repository Roles',
      'Repository ID',
      'Repository Name',
      'Repository Owner',
      'Role',
      'Assigned By',
      'Created At',
    ]);
    for (const role of payload.repoRoles) {
      rows.push([
        'Repository Role',
        escapeCsv(role.repoId),
        escapeCsv(role.repo.name),
        escapeCsv(role.repo.owner),
        escapeCsv(role.role),
        escapeCsv(role.assignedBy),
        escapeCsv(role.createdAt),
      ]);
    }
  }

  // Role Audit Logs
  if (payload.roleAuditLogs.length > 0) {
    rows.push([]); // Empty row separator
    rows.push([
      'Role Audit Logs',
      'Acting As',
      'Repository ID',
      'Action',
      'Old Role',
      'New Role',
      'Created At',
    ]);
    for (const log of payload.roleAuditLogs) {
      rows.push([
        'Role Audit Log',
        escapeCsv(log.actingAs),
        escapeCsv(log.repoId),
        escapeCsv(log.action),
        escapeCsv(log.oldRole),
        escapeCsv(log.newRole),
        escapeCsv(log.createdAt),
      ]);
    }
  }

  // Convert rows to CSV string
  return rows.map((row) => row.join(',')).join('\n');
}
