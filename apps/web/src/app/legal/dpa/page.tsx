import type { Metadata } from 'next';
import {
  DpaScope,
  DpaKeyProvisions,
  DpaFullAgreement,
  DpaRelatedDocs,
  DpaContact,
} from './components';

export const metadata: Metadata = {
  title: 'Data Processing Agreement - Anchorpipe',
  description: 'Anchorpipe Data Processing Agreement (DPA) for enterprise customers',
};

export default function DpaPage() {
  return (
    <main style={{ maxWidth: 900, margin: '64px auto', padding: 24 }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Data Processing Agreement (DPA)</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Last Updated: January 2025</p>

      <div style={{ marginBottom: '2rem' }}>
        <p>
          This Data Processing Agreement (DPA) supplements the Terms of Service and Privacy Policy
          when Anchorpipe processes personal data on behalf of enterprise customers (Data
          Controllers) in the European Economic Area (EEA) or other jurisdictions requiring a DPA.
        </p>
      </div>

      <DpaScope />
      <DpaKeyProvisions />
      <DpaFullAgreement />
      <DpaRelatedDocs />
      <DpaContact />

      <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          This page provides a summary of our Data Processing Agreement. The full DPA is available
          in our documentation repository and is legally binding. This DPA is incorporated by
          reference into the Terms of Service and becomes effective upon execution of the service
          agreement or first processing of personal data.
        </p>
      </section>
    </main>
  );
}
