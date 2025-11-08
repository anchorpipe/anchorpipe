import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Anchorpipe',
  description: 'Anchorpipe Privacy Policy - How we collect, use, and protect your personal data',
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 900, margin: '64px auto', padding: 24 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Last Updated: January 2025</p>

      <div style={{ marginBottom: '2rem' }}>
        <p>
          Anchorpipe is committed to protecting your privacy. Our Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you use our service.
        </p>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Your Rights</h2>
        <p>Under GDPR and CCPA, you have the right to:</p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>Access your personal data</li>
          <li>Request data portability</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing</li>
          <li>Withdraw consent</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Data Subject Requests</h2>
        <p>You can exercise your rights through your account settings:</p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>
            <Link href="/account/privacy" style={{ color: '#0066cc' }}>
              Account Privacy Settings
            </Link>{' '}
            - Export or delete your data
          </li>
          <li>Email: privacy@anchorpipe.org</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Full Documentation</h2>
        <p>
          For the complete Privacy Policy, including detailed information about data collection,
          use, sharing, and retention, please see:
        </p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>
            <a
              href="https://github.com/anchorpipe/anchorpipe/blob/main/docs/reference/compliance/privacy-policy.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc' }}
            >
              Privacy Policy (GitHub)
            </a>
          </li>
          <li>
            <Link href="/legal/dpa" style={{ color: '#0066cc' }}>
              Data Processing Agreement
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/anchorpipe/anchorpipe/blob/main/docs/reference/compliance/retention-policy.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066cc' }}
            >
              Retention Policy
            </a>
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact</h2>
        <p>For privacy inquiries or to exercise your rights:</p>
        <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
          <li>Email: privacy@anchorpipe.org</li>
          <li>Data Protection Officer: dpo@anchorpipe.org</li>
          <li>Security Issues: security@anchorpipe.org</li>
        </ul>
      </section>

      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          This page provides a summary of our Privacy Policy. The full policy is available in our
          documentation repository and is legally binding.
        </p>
      </section>
    </main>
  );
}
