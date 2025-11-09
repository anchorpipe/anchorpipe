/**
 * Security Alerts Service
 *
 * Sends alerts when suspicious patterns are detected in audit logs.
 * Supports email, webhook, and SIEM alerting mechanisms.
 *
 * Story: ST-206 (Medium Priority Gap)
 */

import { logger } from './logger';
import {
  DetectedPattern,
  detectAllSuspiciousPatterns,
  PatternDetectionConfig,
} from './pattern-detection';
import { getEmailService } from './email-service';

/**
 * Alert channel types
 */
export type AlertChannel = 'email' | 'webhook' | 'siem' | 'all';

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  emailRecipients?: string[];
  webhookUrl?: string;
  webhookSecret?: string;
  patternConfig?: PatternDetectionConfig;
}

/**
 * Get default alert configuration
 */
function getDefaultAlertConfig(): AlertConfig {
  const enabled = process.env.SECURITY_ALERTS_ENABLED === 'true';
  const channels = (process.env.SECURITY_ALERTS_CHANNELS || 'email').split(',') as AlertChannel[];

  return {
    enabled,
    channels,
    emailRecipients: process.env.SECURITY_ALERTS_EMAIL_RECIPIENTS?.split(',').map((e) => e.trim()),
    webhookUrl: process.env.SECURITY_ALERTS_WEBHOOK_URL,
    webhookSecret: process.env.SECURITY_ALERTS_WEBHOOK_SECRET,
  };
}

/**
 * Format alert message for email
 */
function formatEmailAlert(pattern: DetectedPattern): { subject: string; body: string } {
  const severityEmoji = {
    low: '⚠️',
    medium: '🔶',
    high: '🔴',
    critical: '🚨',
  }[pattern.severity];

  const subject = `${severityEmoji} Security Alert: ${pattern.type}`;

  const body = `
Security Alert Detected

Type: ${pattern.type}
Severity: ${pattern.severity.toUpperCase()}
Description: ${pattern.description}

Details:
- Count: ${pattern.count} occurrences
- Time Window: ${Math.round(pattern.timeWindow / 1000 / 60)} minutes
- Detected At: ${pattern.detectedAt.toISOString()}

Metadata:
${JSON.stringify(pattern.metadata, null, 2)}

Please review the audit logs for more information.
  `.trim();

  return { subject, body };
}

/**
 * Format alert for webhook
 */
function formatWebhookAlert(pattern: DetectedPattern): Record<string, unknown> {
  return {
    type: 'security_alert',
    pattern: {
      type: pattern.type,
      severity: pattern.severity,
      description: pattern.description,
      count: pattern.count,
      timeWindow: pattern.timeWindow,
      detectedAt: pattern.detectedAt.toISOString(),
      metadata: pattern.metadata,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send alert via email
 */
async function sendEmailAlert(
  pattern: DetectedPattern,
  recipients: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailService = getEmailService();
    const { subject, body } = formatEmailAlert(pattern);

    const results = await Promise.all(
      recipients.map((recipient) =>
        emailService.sendEmail({
          to: recipient,
          subject,
          html: `<pre>${body}</pre>`,
          text: body,
        })
      )
    );

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      return {
        success: false,
        error: `Failed to send to ${failed.length} recipients`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert via webhook
 */
async function sendWebhookAlert(
  pattern: DetectedPattern,
  webhookUrl: string,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = formatWebhookAlert(pattern);
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add HMAC signature if secret is provided
    if (secret) {
      const crypto = await import('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (
      !response.ok &&
      response.status !== 200 &&
      response.status !== 201 &&
      response.status !== 204
    ) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `Webhook returned ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert via SIEM
 */
async function sendSiemAlert(
  pattern: DetectedPattern
): Promise<{ success: boolean; error?: string }> {
  try {
    // Forward to SIEM - the SIEM system will handle alerting
    // For now, we just log it as a security event
    logger.warn('Security alert pattern detected', {
      patternType: pattern.type,
      severity: pattern.severity,
      description: pattern.description,
      metadata: pattern.metadata,
    });

    // TODO: Create a dedicated audit log entry for security alerts
    // This could be forwarded to SIEM for alerting

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert through configured channels
 */
export async function sendSecurityAlert(
  pattern: DetectedPattern,
  config: AlertConfig = getDefaultAlertConfig()
): Promise<{ success: boolean; errors: string[] }> {
  if (!config.enabled) {
    return { success: true, errors: [] };
  }

  const errors: string[] = [];

  // Send via email
  if (config.channels.includes('email') || config.channels.includes('all')) {
    if (config.emailRecipients && config.emailRecipients.length > 0) {
      const result = await sendEmailAlert(pattern, config.emailRecipients);
      if (!result.success) {
        errors.push(`Email alert failed: ${result.error}`);
      }
    } else {
      logger.warn('Email alerts enabled but no recipients configured');
    }
  }

  // Send via webhook
  if (
    (config.channels.includes('webhook') || config.channels.includes('all')) &&
    config.webhookUrl
  ) {
    const result = await sendWebhookAlert(pattern, config.webhookUrl, config.webhookSecret);
    if (!result.success) {
      errors.push(`Webhook alert failed: ${result.error}`);
    }
  }

  // Send via SIEM
  if (config.channels.includes('siem') || config.channels.includes('all')) {
    const result = await sendSiemAlert(pattern);
    if (!result.success) {
      errors.push(`SIEM alert failed: ${result.error}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Check for suspicious patterns and send alerts
 */
export async function checkAndAlertSuspiciousPatterns(
  config: AlertConfig = getDefaultAlertConfig()
): Promise<{
  patternsDetected: number;
  alertsSent: number;
  errors: string[];
}> {
  if (!config.enabled) {
    return { patternsDetected: 0, alertsSent: 0, errors: [] };
  }

  try {
    const patterns = await detectAllSuspiciousPatterns(config.patternConfig);

    if (patterns.length === 0) {
      return { patternsDetected: 0, alertsSent: 0, errors: [] };
    }

    logger.info('Suspicious patterns detected', {
      count: patterns.length,
      patterns: patterns.map((p) => ({ type: p.type, severity: p.severity })),
    });

    // Send alerts for each pattern
    const alertResults = await Promise.all(
      patterns.map((pattern) => sendSecurityAlert(pattern, config))
    );

    const alertsSent = alertResults.filter((r) => r.success).length;
    const allErrors = alertResults.flatMap((r) => r.errors);

    return {
      patternsDetected: patterns.length,
      alertsSent,
      errors: allErrors,
    };
  } catch (error) {
    logger.error('Error checking suspicious patterns', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      patternsDetected: 0,
      alertsSent: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
