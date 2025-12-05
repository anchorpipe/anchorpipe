import React from 'react';
import Head from '@docusaurus/Head';

// Default implementation, that you can customize
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Head>
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </Head>
      {children}
    </>
  );
}

