import Layout from '@theme/Layout';
import React from 'react';

export default function BlogListPage(): JSX.Element {
  return (
    <Layout title="Blog" description="anchorpipe Blog - Updates, tutorials, and insights">
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <h1>anchorpipe Blog</h1>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '1rem',
                }}
              >
                Updates, tutorials, and insights about flaky test management
              </p>
              <p style={{ marginTop: '2rem', color: 'var(--color-text-secondary)' }}>
                No blog posts yet. Check back soon for updates!
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
