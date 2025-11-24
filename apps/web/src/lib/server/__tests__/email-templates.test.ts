import { describe, it, expect } from 'vitest';
import {
  renderPasswordResetEmail,
  renderEmailVerificationEmail,
  renderDsrConfirmationEmail,
} from '../email-templates';

describe('email-templates', () => {
  describe('renderPasswordResetEmail', () => {
    it('renders password reset email with default values', () => {
      const result = renderPasswordResetEmail({
        resetUrl: 'https://example.com/reset?token=abc',
      });

      expect(result.subject).toBe('Reset your Anchorpipe password');
      expect(result.html).toContain('Reset Your Password');
      expect(result.html).toContain('https://example.com/reset?token=abc');
      expect(result.html).toContain('anchorpipe.dev');
      expect(result.text).toContain('Reset Your Password');
      expect(result.text).toContain('https://example.com/reset?token=abc');
    });

    it('renders with custom app name and URL', () => {
      const result = renderPasswordResetEmail({
        resetUrl: 'https://example.com/reset',
        appName: 'TestApp',
        appUrl: 'https://testapp.com',
        expiresIn: '2 hours',
      });

      expect(result.subject).toBe('Reset your TestApp password');
      expect(result.html).toContain('TestApp');
      expect(result.html).toContain('testapp.com');
      expect(result.html).toContain('2 hours');
    });

    it('includes support email when provided', () => {
      const result = renderPasswordResetEmail({
        resetUrl: 'https://example.com/reset',
        supportEmail: 'support@example.com',
      });

      expect(result.html).toContain('support@example.com');
      expect(result.text).toContain('support@example.com');
    });
  });

  describe('renderEmailVerificationEmail', () => {
    it('renders email verification email', () => {
      const result = renderEmailVerificationEmail({
        verificationUrl: 'https://example.com/verify?token=xyz',
      });

      expect(result.subject).toBe('Verify your email address for Anchorpipe');
      expect(result.html).toContain('Verify Your Email');
      expect(result.html).toContain('https://example.com/verify?token=xyz');
      expect(result.text).toContain('Verify Your Email');
    });

    it('includes expiration time when provided', () => {
      const result = renderEmailVerificationEmail({
        verificationUrl: 'https://example.com/verify',
        expiresIn: '24 hours',
      });

      expect(result.html).toContain('24 hours');
      expect(result.text).toContain('24 hours');
    });
  });

  describe('renderDsrConfirmationEmail', () => {
    it('renders DSR confirmation for export', () => {
      const result = renderDsrConfirmationEmail({
        requestId: 'req-123',
        requestType: 'export',
        status: 'completed',
        downloadUrl: 'https://example.com/download/req-123',
      });

      expect(result.subject).toContain('Data Export');
      expect(result.html).toContain('req-123');
      expect(result.html).toContain('export');
      expect(result.html).toContain('completed');
      expect(result.html).toContain('https://example.com/download/req-123');
    });

    it('renders DSR confirmation for deletion', () => {
      const result = renderDsrConfirmationEmail({
        requestId: 'req-456',
        requestType: 'deletion',
        status: 'completed',
      });

      expect(result.subject).toContain('Data Deletion');
      expect(result.html).toContain('req-456');
      expect(result.html).toContain('deletion');
      expect(result.html).not.toContain('download');
    });
  });
});

