/**
 * Email Templates
 *
 * Email templates for various notification types.
 *
 * Story: ST-205 (Medium Priority Gap)
 */

/**
 * Base email template data
 */
interface BaseTemplateData {
  appName?: string;
  appUrl?: string;
  supportEmail?: string;
}

/**
 * Password reset email template data
 */
export interface PasswordResetTemplateData extends BaseTemplateData {
  resetUrl: string;
  expiresIn?: string;
}

/**
 * Email verification template data
 */
export interface EmailVerificationTemplateData extends BaseTemplateData {
  verificationUrl: string;
  expiresIn?: string;
}

/**
 * DSR confirmation template data
 */
export interface DsrConfirmationTemplateData extends BaseTemplateData {
  requestId: string;
  requestType: 'export' | 'deletion';
  status: string;
  downloadUrl?: string;
}

/**
 * Render password reset email
 */
export function renderPasswordResetEmail(data: PasswordResetTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const appName = data.appName || 'Anchorpipe';
  const appUrl = data.appUrl || 'https://anchorpipe.dev';
  const expiresIn = data.expiresIn || '1 hour';

  const subject = `Reset your ${appName} password`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Reset Your Password</h1>
  <p>You requested to reset your password for your ${appName} account.</p>
  <p>Click the button below to reset your password. This link will expire in ${expiresIn}.</p>
  <p style="margin: 30px 0;">
    <a href="${data.resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
  </p>
  <p style="color: #666; font-size: 14px;">If you didn't request this password reset, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    This email was sent by <a href="${appUrl}" style="color: #2563eb;">${appName}</a>.
    ${data.supportEmail ? `If you have questions, contact us at <a href="mailto:${data.supportEmail}" style="color: #2563eb;">${data.supportEmail}</a>.` : ''}
  </p>
</body>
</html>
  `.trim();

  const text = `
Reset Your Password

You requested to reset your password for your ${appName} account.

Click the link below to reset your password. This link will expire in ${expiresIn}.

${data.resetUrl}

If you didn't request this password reset, you can safely ignore this email.

---
This email was sent by ${appName} (${appUrl}).
${data.supportEmail ? `If you have questions, contact us at ${data.supportEmail}.` : ''}
  `.trim();

  return { subject, html, text };
}

/**
 * Render email verification email
 */
export function renderEmailVerificationEmail(data: EmailVerificationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const appName = data.appName || 'Anchorpipe';
  const appUrl = data.appUrl || 'https://anchorpipe.dev';
  const expiresIn = data.expiresIn || '24 hours';

  const subject = `Verify your email address for ${appName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Verify Your Email Address</h1>
  <p>Thank you for signing up for ${appName}!</p>
  <p>Please verify your email address by clicking the button below. This link will expire in ${expiresIn}.</p>
  <p style="margin: 30px 0;">
    <a href="${data.verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
  </p>
  <p style="color: #666; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    This email was sent by <a href="${appUrl}" style="color: #2563eb;">${appName}</a>.
    ${data.supportEmail ? `If you have questions, contact us at <a href="mailto:${data.supportEmail}" style="color: #2563eb;">${data.supportEmail}</a>.` : ''}
  </p>
</body>
</html>
  `.trim();

  const text = `
Verify Your Email Address

Thank you for signing up for ${appName}!

Please verify your email address by clicking the link below. This link will expire in ${expiresIn}.

${data.verificationUrl}

If you didn't create an account, you can safely ignore this email.

---
This email was sent by ${appName} (${appUrl}).
${data.supportEmail ? `If you have questions, contact us at ${data.supportEmail}.` : ''}
  `.trim();

  return { subject, html, text };
}

/**
 * Render DSR confirmation email
 */
export function renderDsrConfirmationEmail(data: DsrConfirmationTemplateData): {
  subject: string;
  html: string;
  text: string;
} {
  const appName = data.appName || 'Anchorpipe';
  const appUrl = data.appUrl || 'https://anchorpipe.dev';
  const requestTypeLabel = data.requestType === 'export' ? 'Data Export' : 'Data Deletion';

  const subject = `${requestTypeLabel} Request - ${appName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">${requestTypeLabel} Request ${data.status === 'completed' ? 'Completed' : 'Received'}</h1>
  <p>Your ${requestTypeLabel.toLowerCase()} request (ID: ${data.requestId}) has been ${data.status === 'completed' ? 'completed' : 'received'}.</p>
  ${
    data.requestType === 'export' && data.downloadUrl
      ? `<p style="margin: 30px 0;">
         <a href="${data.downloadUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Your Data</a>
       </p>`
      : ''
  }
  ${
    data.requestType === 'deletion'
      ? `<p>Your personal data has been redacted and access has been revoked as requested.</p>`
      : ''
  }
  <p style="color: #666; font-size: 14px;">If you have any questions about this request, please contact our support team.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    This email was sent by <a href="${appUrl}" style="color: #2563eb;">${appName}</a>.
    ${data.supportEmail ? `If you have questions, contact us at <a href="mailto:${data.supportEmail}" style="color: #2563eb;">${data.supportEmail}</a>.` : ''}
  </p>
</body>
</html>
  `.trim();

  const text = `
${requestTypeLabel} Request ${data.status === 'completed' ? 'Completed' : 'Received'}

Your ${requestTypeLabel.toLowerCase()} request (ID: ${data.requestId}) has been ${data.status === 'completed' ? 'completed' : 'received'}.

${data.requestType === 'export' && data.downloadUrl ? `Download your data: ${data.downloadUrl}` : ''}
${data.requestType === 'deletion' ? 'Your personal data has been redacted and access has been revoked as requested.' : ''}

If you have any questions about this request, please contact our support team.

---
This email was sent by ${appName} (${appUrl}).
${data.supportEmail ? `If you have questions, contact us at ${data.supportEmail}.` : ''}
  `.trim();

  return { subject, html, text };
}
