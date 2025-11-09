/**
 * Email Queue Processor
 *
 * Processes telemetry events that represent queued emails and sends them.
 * Consumes events from the telemetry_events table with eventType 'dsr.email_queued'.
 *
 * Story: ST-205 (Medium Priority Gap)
 */

import { prisma } from '@anchorpipe/database';
import { sendEmail } from './email-service';
import {
  renderDsrConfirmationEmail,
  renderPasswordResetEmail,
  renderEmailVerificationEmail,
} from './email-templates';
import { logger } from './logger';

/**
 * Process queued email telemetry events
 */
export async function processEmailQueue(
  batchSize: number = 10
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  try {
    // Find unprocessed email events
    const events = await prisma.telemetryEvent.findMany({
      where: {
        eventType: 'dsr.email_queued',
        // Add a processed flag in eventData to track processed events
        // For now, we'll process all and mark them (or delete them)
      },
      take: batchSize,
      orderBy: {
        eventTimestamp: 'asc',
      },
    });

    for (const event of events) {
      try {
        const eventData = (event.eventData as Record<string, unknown>) || {};
        const emailType = eventData.emailType as string | undefined;

        if (!emailType) {
          logger.warn('Email event missing emailType', { eventId: event.id });
          failed++;
          continue;
        }

        // Get user to find email address
        const user = event.userId
          ? await prisma.user.findUnique({
              where: { id: event.userId },
              select: { email: true },
            })
          : null;

        if (!user || !user.email) {
          logger.warn('Email event missing user or email', {
            eventId: event.id,
            userId: event.userId,
          });
          failed++;
          continue;
        }

        // Process based on email type
        const result = await processEmailByType(emailType, eventData, user.email);

        if (result.success) {
          processed++;
          // Delete the processed event (or mark as processed)
          await prisma.telemetryEvent.delete({
            where: { id: event.id },
          });
        } else {
          failed++;
          logger.error('Failed to process email event', {
            eventId: event.id,
            emailType,
            error: result.error,
          });
        }
      } catch (error) {
        failed++;
        logger.error('Error processing email event', {
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  } catch (error) {
    logger.error('Error processing email queue', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return { processed, failed };
}

/**
 * Process email by type
 */
async function processEmailByType(
  emailType: string,
  eventData: Record<string, unknown>,
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  const appName = process.env.APP_NAME || 'Anchorpipe';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://anchorpipe.dev';
  const supportEmail = process.env.SUPPORT_EMAIL;

  const baseData = {
    appName,
    appUrl,
    supportEmail,
  };

  switch (emailType) {
    case 'dsr.confirmation':
      return await sendDsrConfirmationEmail(eventData, userEmail, baseData);

    case 'password.reset':
      return await sendPasswordResetEmail(eventData, userEmail, baseData);

    case 'email.verification':
      return await sendEmailVerificationEmail(eventData, userEmail, baseData);

    default:
      logger.warn('Unknown email type', { emailType, eventData });
      return { success: false, error: `Unknown email type: ${emailType}` };
  }
}

/**
 * Send DSR confirmation email
 */
async function sendDsrConfirmationEmail(
  eventData: Record<string, unknown>,
  userEmail: string,
  baseData: { appName: string; appUrl: string; supportEmail?: string }
): Promise<{ success: boolean; error?: string }> {
  const requestId = eventData.requestId as string;
  const requestType = (eventData.type as 'export' | 'deletion') || 'export';
  const status = (eventData.status as string) || 'completed';
  const downloadUrl = eventData.downloadUrl as string | undefined;

  const template = renderDsrConfirmationEmail({
    ...baseData,
    requestId,
    requestType,
    status,
    downloadUrl,
  });

  const result = await sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return result;
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(
  eventData: Record<string, unknown>,
  userEmail: string,
  baseData: { appName: string; appUrl: string; supportEmail?: string }
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = eventData.resetUrl as string;
  const expiresIn = eventData.expiresIn as string | undefined;

  if (!resetUrl) {
    return { success: false, error: 'Missing resetUrl in event data' };
  }

  const template = renderPasswordResetEmail({
    ...baseData,
    resetUrl,
    expiresIn,
  });

  const result = await sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return result;
}

/**
 * Send email verification email
 */
async function sendEmailVerificationEmail(
  eventData: Record<string, unknown>,
  userEmail: string,
  baseData: { appName: string; appUrl: string; supportEmail?: string }
): Promise<{ success: boolean; error?: string }> {
  const verificationUrl = eventData.verificationUrl as string;
  const expiresIn = eventData.expiresIn as string | undefined;

  if (!verificationUrl) {
    return { success: false, error: 'Missing verificationUrl in event data' };
  }

  const template = renderEmailVerificationEmail({
    ...baseData,
    verificationUrl,
    expiresIn,
  });

  const result = await sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return result;
}

/**
 * Queue an email for sending (creates telemetry event)
 */
export async function queueEmail(
  userId: string,
  emailType: string,
  emailData: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.telemetryEvent.create({
      data: {
        userId,
        eventType: 'dsr.email_queued',
        eventData: {
          emailType,
          ...emailData,
          queuedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to queue email', {
      userId,
      emailType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
