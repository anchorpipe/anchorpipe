import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processEmailQueue, queueEmail } from '../email-queue-processor';

const mockPrisma = vi.hoisted(() => ({
  telemetryEvent: {
    findMany: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
}));

const mockSendEmail = vi.hoisted(() => vi.fn());
const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@anchorpipe/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../email-service', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('../email-templates', () => ({
  renderDsrConfirmationEmail: vi.fn(() => ({
    subject: 'DSR Confirmation',
    html: '<html>DSR</html>',
    text: 'DSR',
  })),
  renderPasswordResetEmail: vi.fn(() => ({
    subject: 'Password Reset',
    html: '<html>Reset</html>',
    text: 'Reset',
  })),
  renderEmailVerificationEmail: vi.fn(() => ({
    subject: 'Email Verification',
    html: '<html>Verify</html>',
    text: 'Verify',
  })),
}));

vi.mock('../logger', () => ({
  logger: mockLogger,
}));

describe('email-queue-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ success: true });
    vi.stubEnv('APP_NAME', 'TestApp');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://test.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('queueEmail', () => {
    it('queues email event', async () => {
      mockPrisma.telemetryEvent.create.mockResolvedValueOnce({ id: 'event-1' });

      await queueEmail('user-1', 'email.verification', {
        verificationUrl: 'https://example.com/verify',
      });

      expect(mockPrisma.telemetryEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          eventType: 'dsr.email_queued',
          eventData: expect.objectContaining({
            emailType: 'email.verification',
            verificationUrl: 'https://example.com/verify',
            queuedAt: expect.any(String),
          }),
        },
      });
    });
  });

  describe('processEmailQueue', () => {
    const createMockEvent = (overrides: {
      id?: string;
      userId?: string;
      eventData?: Record<string, unknown>;
    }) => ({
      id: 'event-1',
      userId: 'user-1',
      eventData: {},
      ...overrides,
    });

    it('processes email events successfully', async () => {
      mockPrisma.telemetryEvent.findMany.mockResolvedValueOnce([
        createMockEvent({
          eventData: {
            emailType: 'email.verification',
            verificationUrl: 'https://example.com/verify',
          },
        }),
      ]);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        email: 'user@example.com',
      });
      mockPrisma.telemetryEvent.delete.mockResolvedValueOnce({});

      const result = await processEmailQueue(10);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockPrisma.telemetryEvent.delete).toHaveBeenCalledWith({
        where: { id: 'event-1' },
      });
    });

    it('handles missing emailType', async () => {
      mockPrisma.telemetryEvent.findMany.mockResolvedValueOnce([createMockEvent({})]);

      const result = await processEmailQueue(10);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email event missing emailType',
        expect.objectContaining({ eventId: 'event-1' })
      );
    });

    it('handles missing user email', async () => {
      mockPrisma.telemetryEvent.findMany.mockResolvedValueOnce([
        createMockEvent({ eventData: { emailType: 'email.verification' } }),
      ]);
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await processEmailQueue(10);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email event missing user or email',
        expect.objectContaining({ eventId: 'event-1' })
      );
    });

    it('processes multiple email types', async () => {
      mockPrisma.telemetryEvent.findMany.mockResolvedValueOnce([
        {
          id: 'event-1',
          userId: 'user-1',
          eventData: {
            emailType: 'password.reset',
            resetUrl: 'https://example.com/reset',
          },
        },
        {
          id: 'event-2',
          userId: 'user-2',
          eventData: {
            emailType: 'dsr.confirmation',
            requestId: 'req-1',
            type: 'export',
            status: 'completed',
          },
        },
      ]);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ email: 'user1@example.com' })
        .mockResolvedValueOnce({ email: 'user2@example.com' });
      mockPrisma.telemetryEvent.delete.mockResolvedValue({});

      const result = await processEmailQueue(10);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
    });

    it('respects batch size limit', async () => {
      mockPrisma.telemetryEvent.findMany.mockResolvedValueOnce([
        { id: 'event-1', userId: 'user-1', eventData: { emailType: 'email.verification' } },
        { id: 'event-2', userId: 'user-2', eventData: { emailType: 'email.verification' } },
      ]);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ email: 'user1@example.com' })
        .mockResolvedValueOnce({ email: 'user2@example.com' });
      mockPrisma.telemetryEvent.delete.mockResolvedValue({});

      await processEmailQueue(2);

      expect(mockPrisma.telemetryEvent.findMany).toHaveBeenCalledWith({
        where: { eventType: 'dsr.email_queued' },
        take: 2,
        orderBy: { eventTimestamp: 'asc' },
      });
    });
  });
});

