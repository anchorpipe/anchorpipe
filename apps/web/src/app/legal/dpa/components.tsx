import Link from 'next/link';

export function DpaScope() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Scope</h2>
      <p>This DPA applies when:</p>
      <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
        <li>Anchorpipe processes personal data on behalf of an enterprise customer</li>
        <li>The processing involves personal data subject to GDPR, CCPA, or similar regulations</li>
        <li>The customer is a Data Controller under applicable data protection laws</li>
      </ul>
    </section>
  );
}

export function DpaKeyProvisions() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Key Provisions</h2>
      <ul style={{ marginLeft: '2rem' }}>
        <li>
          <strong>Processing Requirements</strong>: Anchorpipe processes personal data only as
          instructed by the Data Controller
        </li>
        <li>
          <strong>Security Measures</strong>: AES-256 encryption at rest, TLS 1.2+ in transit, RBAC,
          audit logging
        </li>
        <li>
          <strong>Data Subject Rights</strong>: Anchorpipe assists in responding to data subject
          requests within 30 days
        </li>
        <li>
          <strong>Breach Notification</strong>: Anchorpipe notifies Data Controller within 72 hours
          of becoming aware of a breach
        </li>
        <li>
          <strong>Sub-processors</strong>: Data Controller is notified of new sub-processors with
          30-day objection period
        </li>
        <li>
          <strong>International Transfers</strong>: Appropriate safeguards (SCCs, adequacy
          decisions) for transfers outside EEA
        </li>
      </ul>
    </section>
  );
}

export function DpaFullAgreement() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Full Agreement</h2>
      <p>
        For the complete Data Processing Agreement, including detailed provisions on processing
        details, obligations, sub-processors, and liability, please see:
      </p>
      <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
        <li>
          <a
            href="https://github.com/anchorpipe/anchorpipe/blob/main/docs/reference/compliance/data-processing-agreement.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0066cc' }}
          >
            Data Processing Agreement (GitHub)
          </a>
        </li>
      </ul>
    </section>
  );
}

export function DpaRelatedDocs() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Related Documentation</h2>
      <ul style={{ marginLeft: '2rem' }}>
        <li>
          <Link href="/privacy" style={{ color: '#0066cc' }}>
            Privacy Policy
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
        <li>
          <a
            href="https://github.com/anchorpipe/anchorpipe/blob/main/docs/reference/compliance/README.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#0066cc' }}
          >
            Compliance Documentation
          </a>
        </li>
      </ul>
    </section>
  );
}

export function DpaContact() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Contact</h2>
      <p>For questions about this DPA or data processing:</p>
      <ul style={{ marginLeft: '2rem', marginTop: '0.5rem' }}>
        <li>Data Protection Officer: dpo@anchorpipe.dev</li>
        <li>Privacy Inquiries: privacy@anchorpipe.dev</li>
        <li>Enterprise Customers: Contact your account manager</li>
      </ul>
    </section>
  );
}
