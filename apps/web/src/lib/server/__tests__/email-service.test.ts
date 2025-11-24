import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

async function loadEmailServiceModule() {
  return await import('../email-service');
}

describe('email-service', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLogger.info.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.error.mockReset();
    process.env.EMAIL_PROVIDER = 'console';
    process.env.EMAIL_FROM = 'noreply@test.dev';
    process.env.EMAIL_REPLY_TO = 'support@test.dev';
    process.env.NODE_ENV = 'test';
  });

  it('sends email via console provider and applies default headers', async () => {
    const { sendEmail } = await loadEmailServiceModule();

    const result = await sendEmail({
      to: 'dev@example.com',
      subject: 'Welcome',
      html: '<p>Hello!</p>',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^console-/);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Email would be sent (console provider)',
      expect.objectContaining({
        to: 'dev@example.com',
        subject: 'Welcome',
        from: 'noreply@test.dev',
      })
    );
  });

  it('logs an error and surfaces failure when provider throws', async () => {
    const { getEmailService } = await loadEmailServiceModule();
    const service = getEmailService();

    // Force the underlying provider to throw
    (service as any).provider = {
      sendEmail: () => {
        throw new Error('mail down');
      },
    };

    const result = await service.sendEmail({
      to: 'ops@example.com',
      subject: 'Alert',
      html: '<p>Failure</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('mail down');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to send email',
      expect.objectContaining({
        error: 'mail down',
        to: 'ops@example.com',
        subject: 'Alert',
      })
    );
  });
});

