/**
 * Pattern Detection Service
 *
 * Detects suspicious patterns in audit logs for security alerting.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { AUDIT_ACTIONS } from './audit-service';
import { logger } from './logger';

/**
 * Suspicious pattern types
 */
export enum SuspiciousPatternType {
  MultipleFailedLogins = 'multiple_failed_logins',
  BruteForceAttempt = 'brute_force_attempt',
  UnusualAccessPattern = 'unusual_access_pattern',
  MultipleFailedHmacAuth = 'multiple_failed_hmac_auth',
  RapidRoleChanges = 'rapid_role_changes',
  UnusualIpAddress = 'unusual_ip_address',
  TokenAbuse = 'token_abuse',
}

/**
 * Detected suspicious pattern
 */
export interface DetectedPattern {
  type: SuspiciousPatternType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, unknown>;
  count: number;
  timeWindow: number; // milliseconds
  detectedAt: Date;
}

/**
 * Pattern detection configuration
 */
export interface PatternDetectionConfig {
  // Multiple failed logins
  failedLoginThreshold: number; // Number of failures to trigger alert
  failedLoginWindowMs: number; // Time window in milliseconds

  // Brute force
  bruteForceThreshold: number;
  bruteForceWindowMs: number;

  // HMAC auth failures
  hmacFailureThreshold: number;
  hmacFailureWindowMs: number;

  // Role changes
  roleChangeThreshold: number;
  roleChangeWindowMs: number;

  // Token abuse
  tokenRevocationThreshold: number;
  tokenRevocationWindowMs: number;
}

/**
 * Get default pattern detection configuration
 */
function getDefaultConfig(): PatternDetectionConfig {
  return {
    failedLoginThreshold: parseInt(process.env.ALERT_FAILED_LOGIN_THRESHOLD || '10', 10),
    failedLoginWindowMs: parseInt(
      process.env.ALERT_FAILED_LOGIN_WINDOW_MS || String(15 * 60 * 1000),
      10
    ),
    bruteForceThreshold: parseInt(process.env.ALERT_BRUTE_FORCE_THRESHOLD || '20', 10),
    bruteForceWindowMs: parseInt(
      process.env.ALERT_BRUTE_FORCE_WINDOW_MS || String(30 * 60 * 1000),
      10
    ),
    hmacFailureThreshold: parseInt(process.env.ALERT_HMAC_FAILURE_THRESHOLD || '10', 10),
    hmacFailureWindowMs: parseInt(
      process.env.ALERT_HMAC_FAILURE_WINDOW_MS || String(15 * 60 * 1000),
      10
    ),
    roleChangeThreshold: parseInt(process.env.ALERT_ROLE_CHANGE_THRESHOLD || '5', 10),
    roleChangeWindowMs: parseInt(
      process.env.ALERT_ROLE_CHANGE_WINDOW_MS || String(60 * 60 * 1000),
      10
    ),
    tokenRevocationThreshold: parseInt(process.env.ALERT_TOKEN_REVOCATION_THRESHOLD || '10', 10),
    tokenRevocationWindowMs: parseInt(
      process.env.ALERT_TOKEN_REVOCATION_WINDOW_MS || String(60 * 60 * 1000),
      10
    ),
  };
}

/**
 * Detect multiple failed login attempts
 */
export async function detectMultipleFailedLogins(
  config: PatternDetectionConfig = getDefaultConfig()
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const windowStart = new Date(Date.now() - config.failedLoginWindowMs);

  // Group by IP address
  const failedLogins = await prisma.auditLog.findMany({
    where: {
      action: AUDIT_ACTIONS.loginFailure,
      createdAt: {
        gte: windowStart,
      },
    },
    select: {
      ipAddress: true,
      actorId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Group by IP
  const ipGroups = new Map<string, typeof failedLogins>();
  for (const log of failedLogins) {
    if (!log.ipAddress) continue;
    const existing = ipGroups.get(log.ipAddress) || [];
    existing.push(log);
    ipGroups.set(log.ipAddress, existing);
  }

  // Check each IP group
  for (const [ip, logs] of ipGroups.entries()) {
    if (logs.length >= config.failedLoginThreshold) {
      patterns.push({
        type: SuspiciousPatternType.MultipleFailedLogins,
        severity: logs.length >= config.bruteForceThreshold ? 'high' : 'medium',
        description: `Multiple failed login attempts from IP ${ip}`,
        metadata: {
          ipAddress: ip,
          failureCount: logs.length,
          timeWindow: config.failedLoginWindowMs,
          firstAttempt: logs[logs.length - 1]?.createdAt,
          lastAttempt: logs[0]?.createdAt,
        },
        count: logs.length,
        timeWindow: config.failedLoginWindowMs,
        detectedAt: new Date(),
      });
    }
  }

  return patterns;
}

/**
 * Detect multiple failed HMAC authentication attempts
 */
export async function detectMultipleFailedHmacAuth(
  config: PatternDetectionConfig = getDefaultConfig()
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const windowStart = new Date(Date.now() - config.hmacFailureWindowMs);

  const failedAuths = await prisma.auditLog.findMany({
    where: {
      action: AUDIT_ACTIONS.hmacAuthFailure,
      createdAt: {
        gte: windowStart,
      },
    },
    select: {
      subjectId: true, // repoId
      ipAddress: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Group by repository
  const repoGroups = new Map<string, typeof failedAuths>();
  for (const log of failedAuths) {
    if (!log.subjectId) continue;
    const existing = repoGroups.get(log.subjectId) || [];
    existing.push(log);
    repoGroups.set(log.subjectId, existing);
  }

  // Check each repository group
  for (const [repoId, logs] of repoGroups.entries()) {
    if (logs.length >= config.hmacFailureThreshold) {
      patterns.push({
        type: SuspiciousPatternType.MultipleFailedHmacAuth,
        severity: 'high',
        description: `Multiple failed HMAC authentication attempts for repository ${repoId}`,
        metadata: {
          repoId,
          failureCount: logs.length,
          timeWindow: config.hmacFailureWindowMs,
          firstAttempt: logs[logs.length - 1]?.createdAt,
          lastAttempt: logs[0]?.createdAt,
        },
        count: logs.length,
        timeWindow: config.hmacFailureWindowMs,
        detectedAt: new Date(),
      });
    }
  }

  return patterns;
}

/**
 * Detect rapid role changes
 */
export async function detectRapidRoleChanges(
  config: PatternDetectionConfig = getDefaultConfig()
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const windowStart = new Date(Date.now() - config.roleChangeWindowMs);

  const roleChanges = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [AUDIT_ACTIONS.roleAssigned, AUDIT_ACTIONS.roleRemoved],
      },
      createdAt: {
        gte: windowStart,
      },
    },
    select: {
      subjectId: true, // repoId
      actorId: true,
      action: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Group by repository
  const repoGroups = new Map<string, typeof roleChanges>();
  for (const log of roleChanges) {
    if (!log.subjectId) continue;
    const existing = repoGroups.get(log.subjectId) || [];
    existing.push(log);
    repoGroups.set(log.subjectId, existing);
  }

  // Check each repository
  for (const [repoId, logs] of repoGroups.entries()) {
    if (logs.length >= config.roleChangeThreshold) {
      patterns.push({
        type: SuspiciousPatternType.RapidRoleChanges,
        severity: 'medium',
        description: `Rapid role changes detected for repository ${repoId}`,
        metadata: {
          repoId,
          changeCount: logs.length,
          timeWindow: config.roleChangeWindowMs,
          changes: logs.map((log: { action: string; actorId: string | null; createdAt: Date }) => ({
            action: log.action,
            actorId: log.actorId,
            timestamp: log.createdAt,
          })),
        },
        count: logs.length,
        timeWindow: config.roleChangeWindowMs,
        detectedAt: new Date(),
      });
    }
  }

  return patterns;
}

/**
 * Detect token abuse patterns
 */
export async function detectTokenAbuse(
  config: PatternDetectionConfig = getDefaultConfig()
): Promise<DetectedPattern[]> {
  const patterns: DetectedPattern[] = [];
  const windowStart = new Date(Date.now() - config.tokenRevocationWindowMs);

  const tokenRevocations = await prisma.auditLog.findMany({
    where: {
      action: AUDIT_ACTIONS.tokenRevoked,
      createdAt: {
        gte: windowStart,
      },
    },
    select: {
      subjectId: true,
      actorId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Group by actor
  const actorGroups = new Map<string, typeof tokenRevocations>();
  for (const log of tokenRevocations) {
    if (!log.actorId) continue;
    const existing = actorGroups.get(log.actorId) || [];
    existing.push(log);
    actorGroups.set(log.actorId, existing);
  }

  // Check each actor
  for (const [actorId, logs] of actorGroups.entries()) {
    if (logs.length >= config.tokenRevocationThreshold) {
      patterns.push({
        type: SuspiciousPatternType.TokenAbuse,
        severity: 'medium',
        description: `Unusual number of token revocations by user ${actorId}`,
        metadata: {
          actorId,
          revocationCount: logs.length,
          timeWindow: config.tokenRevocationWindowMs,
        },
        count: logs.length,
        timeWindow: config.tokenRevocationWindowMs,
        detectedAt: new Date(),
      });
    }
  }

  return patterns;
}

/**
 * Detect all suspicious patterns
 */
export async function detectAllSuspiciousPatterns(
  config: PatternDetectionConfig = getDefaultConfig()
): Promise<DetectedPattern[]> {
  const allPatterns: DetectedPattern[] = [];

  try {
    const [failedLogins, failedHmacAuth, rapidRoleChanges, tokenAbuse] = await Promise.all([
      detectMultipleFailedLogins(config),
      detectMultipleFailedHmacAuth(config),
      detectRapidRoleChanges(config),
      detectTokenAbuse(config),
    ]);

    allPatterns.push(...failedLogins, ...failedHmacAuth, ...rapidRoleChanges, ...tokenAbuse);
  } catch (error) {
    logger.error('Error detecting suspicious patterns', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return allPatterns;
}
