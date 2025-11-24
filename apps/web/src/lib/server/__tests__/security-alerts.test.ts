import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { DetectedPattern } from '../pattern-detection';
import * as securityAlerts from '../security-alerts';

const { sendSecurityAlert, checkAndAlertSuspiciousPatterns } = securityAlerts;

const mockSendEmail = vi.hoisted(() => vi.fn());
vi.mock('../email-service', () => ({
  getEmailService: () => ({
    sendEmail: mockSendEmail,
  }),
}));

const mockDetectPatterns = vi.hoisted(() => vi.fn());
vi.mock('../pattern-detection', () => ({
  detectAllSuspiciousPatterns: mockDetectPatterns,
}));

const loggerInfo = vi.hoisted(() => vi.fn());
const loggerWarn = vi.hoisted(() => vi.fn());
const loggerError = vi.hoisted(() => vi.fn());
vi.mock('../logger', () => ({
  logger: {
    info: loggerInfo,
    warn: loggerWarn,
    error: loggerError,
  },
}));

const samplePattern: DetectedPattern = {
  type: 'multiple_failed_logins' as DetectedPattern['type'],
  severity: 'high',
  description: 'More than 10 failed logins within 5 minutes',
  count: 12,
  timeWindow: 5 * 60 * 1000,
  detectedAt: new Date('2025-01-01T00:00:00.000Z'),
  metadata: { ip: '10.0.0.1' },
};

describe('security-alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true });
    mockDetectPatterns.mockResolvedValue([]);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, text: vi.fn() }) as any;
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  describe('sendSecurityAlert', () => {
    it('no-ops when disabled', async () => {
      const result = await sendSecurityAlert(samplePattern, {
        enabled: false,
        channels: ['email'],
        emailRecipients: ['sec@example.com'],
      });

      expect(result).toEqual({ success: true, errors: [] });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('sends email alerts to configured recipients', async () => {
      const result = await sendSecurityAlert(samplePattern, {
        enabled: true,
        channels: ['email'],
        emailRecipients: ['sec@example.com', 'ops@example.com'],
      });

      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ops@example.com',
          subject: expect.stringContaining('Security Alert'),
        })
      );
    });

    it('collects email errors', async () => {
      mockSendEmail
        .mockResolvedValueOnce({ success: false, error: 'SMTP down' })
        .mockResolvedValueOnce({ success: true });

      const result = await sendSecurityAlert(samplePattern, {
        enabled: true,
        channels: ['email'],
        emailRecipients: ['sec@example.com', 'ops@example.com'],
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Email alert failed');
    });

    it('posts webhook payload when channel enabled', async () => {
      const result = await sendSecurityAlert(samplePattern, {
        enabled: true,
        channels: ['webhook'],
        webhookUrl: 'https://alerts.example.com',
      });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://alerts.example.com',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('logs webhook errors when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'boom',
      });

      const result = await sendSecurityAlert(samplePattern, {
        enabled: true,
        channels: ['webhook'],
        webhookUrl: 'https://alerts.example.com',
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Webhook alert failed');
    });

    it('invokes SIEM channel when requested', async () => {
      const result = await sendSecurityAlert(samplePattern, {
        enabled: true,
        channels: ['siem'],
      });

      expect(result.success).toBe(true);
      expect(loggerWarn).toHaveBeenCalledWith('Security alert pattern detected', expect.any(Object));
    });
  });

  describe('checkAndAlertSuspiciousPatterns', () => {
    it('short-circuits when disabled', async () => {
      const result = await checkAndAlertSuspiciousPatterns({
        enabled: false,
        channels: ['email'],
      });

      expect(result).toEqual({ patternsDetected: 0, alertsSent: 0, errors: [] });
      expect(mockDetectPatterns).not.toHaveBeenCalled();
    });

    it('sends alerts for detected patterns and aggregates errors', async () => {
      mockDetectPatterns.mockResolvedValue([samplePattern, { ...samplePattern, type: 'other' }]);
      mockSendEmail
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'SMTP down' });

      const result = await checkAndAlertSuspiciousPatterns({
        enabled: true,
        channels: ['email'],
        emailRecipients: ['sec@example.com'],
      });

      expect(result.patternsDetected).toBe(2);
      expect(result.alertsSent).toBe(1);
      expect(result.errors[0]).toContain('Email alert failed:');
    });

    it('handles detector errors gracefully', async () => {
      mockDetectPatterns.mockRejectedValue(new Error('db unavailable'));

      const result = await checkAndAlertSuspiciousPatterns({
        enabled: true,
        channels: ['email'],
        emailRecipients: ['sec@example.com'],
      });

      expect(result.errors).toEqual(['db unavailable']);
      expect(loggerError).toHaveBeenCalledWith(
        'Error checking suspicious patterns',
        expect.objectContaining({ error: 'db unavailable' })
      );
    });
  });
});

