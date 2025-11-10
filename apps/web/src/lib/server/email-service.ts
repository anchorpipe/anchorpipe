/**
 * Email Service
 *
 * Abstraction layer for sending emails. Supports multiple providers
 * (Resend, SendGrid, SMTP) with a unified interface.
 *
 * Story: ST-205 (Medium Priority Gap)
 */

import { logger } from './logger';

/**
 * Email provider interface
 */
export interface EmailProvider {
  sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Email parameters
 */
export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Email service configuration
 */
interface EmailConfig {
  provider: 'console' | 'resend' | 'sendgrid' | 'smtp';
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  // Provider-specific config
  resendApiKey?: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
}

/**
 * Console email provider (for development)
 * Logs emails to console instead of sending
 */
class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(
    params: EmailParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    logger.info('Email would be sent (console provider)', {
      to: params.to,
      subject: params.subject,
      from: params.from,
      // Don't log full HTML content
      htmlLength: params.html.length,
    });

    // In development, log the full email for testing
    if (process.env.NODE_ENV === 'development') {
      console.log('\n=== EMAIL (Console Provider) ===');
      console.log(`To: ${params.to}`);
      console.log(`Subject: ${params.subject}`);
      console.log(`From: ${params.from || 'noreply@anchorpipe.dev'}`);
      console.log(`\n${params.text || params.html}\n`);
      console.log('================================\n');
    }

    return { success: true, messageId: `console-${Date.now()}` };
  }
}

/**
 * Email service
 */
class EmailService {
  private provider: EmailProvider;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  /**
   * Create email provider based on configuration
   */
  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'console':
        return new ConsoleEmailProvider();
      case 'resend':
        // TODO: Implement Resend provider when Resend SDK is added
        logger.warn('Resend provider not yet implemented, falling back to console');
        return new ConsoleEmailProvider();
      case 'sendgrid':
        // TODO: Implement SendGrid provider when SendGrid SDK is added
        logger.warn('SendGrid provider not yet implemented, falling back to console');
        return new ConsoleEmailProvider();
      case 'smtp':
        // TODO: Implement SMTP provider when nodemailer is added
        logger.warn('SMTP provider not yet implemented, falling back to console');
        return new ConsoleEmailProvider();
      default:
        return new ConsoleEmailProvider();
    }
  }

  /**
   * Send an email
   */
  async sendEmail(
    params: EmailParams
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const emailParams: EmailParams = {
        ...params,
        from: params.from || this.config.fromEmail || 'noreply@anchorpipe.dev',
        replyTo: params.replyTo || this.config.replyTo,
      };

      return await this.provider.sendEmail(emailParams);
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: params.to,
        subject: params.subject,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.config.provider !== 'console' || process.env.NODE_ENV === 'development';
  }
}

/**
 * Get email service instance
 */
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    const config: EmailConfig = {
      provider: (process.env.EMAIL_PROVIDER as EmailConfig['provider']) || 'console',
      fromEmail: process.env.EMAIL_FROM || 'noreply@anchorpipe.dev',
      fromName: process.env.EMAIL_FROM_NAME || 'Anchorpipe',
      replyTo: process.env.EMAIL_REPLY_TO,
      resendApiKey: process.env.RESEND_API_KEY,
      sendgridApiKey: process.env.SENDGRID_API_KEY,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
      smtpUser: process.env.SMTP_USER,
      smtpPassword: process.env.SMTP_PASSWORD,
      smtpSecure: process.env.SMTP_SECURE === 'true',
    };

    emailServiceInstance = new EmailService(config);
  }

  return emailServiceInstance;
}

/**
 * Send email (convenience function)
 */
export async function sendEmail(
  params: EmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const service = getEmailService();
  return await service.sendEmail(params);
}
