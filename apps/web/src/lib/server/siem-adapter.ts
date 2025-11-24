/**
 * SIEM Adapter
 *
 * Interface for forwarding audit logs to SIEM systems.
 * Supports multiple formats: Syslog, HTTP/JSON, and native API integrations.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

/**
 * SIEM adapter interface
 */
export interface SiemAdapter {
  /**
   * Forward a single audit log entry to SIEM
   */
  forwardLog(log: SiemLogEntry): Promise<{ success: boolean; error?: string }>;

  /**
   * Forward multiple audit log entries in batch
   */
  forwardBatch(logs: SiemLogEntry[]): Promise<SiemForwardResult>;

  /**
   * Test connectivity to SIEM system
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

/**
 * SIEM log entry format
 */
export interface SiemLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  action: string;
  subject: string;
  subjectId?: string;
  actorId?: string;
  actorEmail?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Result of forwarding logs to SIEM
 */
export interface SiemForwardResult {
  success: number;
  failed: number;
  errors?: Array<{ logId: string; error: string }>;
}

/**
 * SIEM adapter configuration
 */
export interface SiemAdapterConfig {
  type: 'syslog' | 'http' | 'splunk' | 'elasticsearch';
  enabled: boolean;
  format?: 'json' | 'cef' | 'leef';
  batchSize?: number;
  retryAttempts?: number;
  retryDelay?: number; // milliseconds
  timeout?: number; // milliseconds
  // Provider-specific config
  syslog?: {
    host: string;
    port: number;
    protocol: 'udp' | 'tcp' | 'tls';
    facility?: number;
    tag?: string;
  };
  http?: {
    url: string;
    method?: 'POST' | 'PUT';
    headers?: Record<string, string>;
    auth?: {
      type: 'bearer' | 'basic';
      token?: string;
      username?: string;
      password?: string;
    };
  };
  splunk?: {
    host: string;
    port: number;
    token: string;
    index?: string;
    source?: string;
    sourcetype?: string;
  };
  elasticsearch?: {
    url: string;
    index: string;
    username?: string;
    password?: string;
    apiKey?: string;
  };
}

/**
 * Convert audit log to SIEM format
 */
export function convertAuditLogToSiemEntry(auditLog: {
  id: string;
  action: string;
  subject: string;
  subjectId?: string | null;
  actorId?: string | null;
  description?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  actor?: {
    email?: string | null;
  } | null;
}): SiemLogEntry {
  // Determine severity based on action type
  const severity = getSeverityForAction(auditLog.action);

  return {
    id: auditLog.id,
    timestamp: auditLog.createdAt.toISOString(),
    action: auditLog.action,
    subject: auditLog.subject,
    subjectId: auditLog.subjectId || undefined,
    actorId: auditLog.actorId || undefined,
    actorEmail: auditLog.actor?.email || undefined,
    description: auditLog.description || undefined,
    metadata: (auditLog.metadata ?? undefined) as Record<string, unknown> | undefined,
    ipAddress: auditLog.ipAddress || undefined,
    userAgent: auditLog.userAgent || undefined,
    severity,
  };
}

/**
 * Get severity level for audit action
 */
function getSeverityForAction(action: string): SiemLogEntry['severity'] {
  // Critical actions
  if (action.includes('failure') || action.includes('revoked') || action.includes('deletion')) {
    return 'error';
  }

  // Warning actions
  if (action.includes('config') || action.includes('token')) {
    return 'warning';
  }

  // Default to info
  return 'info';
}

/**
 * Format log entry as CEF (Common Event Format)
 */
export function formatAsCEF(entry: SiemLogEntry): string {
  const cefVersion = '0';
  const deviceVendor = 'Anchorpipe';
  const deviceProduct = 'Anchorpipe';
  const deviceVersion = '1.0';
  const signatureId = entry.action;
  const name = entry.description || entry.action;
  const severity = getCEFSeverity(entry.severity || 'info');

  // CEF extensions
  const extensions: string[] = [];
  if (entry.actorId) extensions.push(`suser=${escapeCEF(entry.actorId)}`);
  if (entry.actorEmail) extensions.push(`suser=${escapeCEF(entry.actorEmail)}`);
  if (entry.ipAddress) extensions.push(`src=${entry.ipAddress}`);
  if (entry.subjectId) extensions.push(`dhost=${escapeCEF(entry.subjectId)}`);
  if (entry.metadata) {
    extensions.push(`cs1=${escapeCEF(JSON.stringify(entry.metadata))}`);
  }

  return `CEF:${cefVersion}|${deviceVendor}|${deviceProduct}|${deviceVersion}|${signatureId}|${name}|${severity}|${extensions.join(' ')}`;
}

/**
 * Format log entry as LEEF (Log Event Extended Format)
 */
export function formatAsLEEF(entry: SiemLogEntry): string {
  const version = '2.0';
  const vendor = 'Anchorpipe';
  const product = 'Anchorpipe';
  const versionNum = '1.0';
  const eventId = entry.action;
  const name = entry.description || entry.action;

  const attributes: string[] = [];
  attributes.push(`sev=${getLEEFSeverity(entry.severity || 'info')}`);
  if (entry.actorId) attributes.push(`usrName=${entry.actorId}`);
  if (entry.actorEmail) attributes.push(`usrEmail=${entry.actorEmail}`);
  if (entry.ipAddress) attributes.push(`src=${entry.ipAddress}`);
  if (entry.subjectId) attributes.push(`dst=${entry.subjectId}`);
  if (entry.metadata) {
    attributes.push(`customData=${JSON.stringify(entry.metadata)}`);
  }

  return `LEEF:${version}|${vendor}|${product}|${versionNum}|${eventId}|${name}|${attributes.join('\t')}`;
}

/**
 * Get CEF severity number
 */
function getCEFSeverity(severity: SiemLogEntry['severity']): number {
  switch (severity) {
    case 'critical':
      return 10;
    case 'error':
      return 8;
    case 'warning':
      return 5;
    case 'info':
    default:
      return 3;
  }
}

/**
 * Get LEEF severity number
 */
function getLEEFSeverity(severity: SiemLogEntry['severity']): number {
  switch (severity) {
    case 'critical':
      return 1;
    case 'error':
      return 2;
    case 'warning':
      return 3;
    case 'info':
    default:
      return 4;
  }
}

/**
 * Escape CEF special characters
 */
function escapeCEF(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/=/g, '\\=')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
