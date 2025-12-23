import React, { useEffect } from 'react';
import Head from '@docusaurus/Head';
import { useColorMode } from '@docusaurus/theme-common';

// Default implementation, that you can customize
export default function Root({ children }: { children: React.ReactNode }) {
  const { colorMode } = useColorMode();

  // Sync theme attribute when colorMode changes (client-side)
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (htmlElement) {
      htmlElement.setAttribute('data-theme', colorMode);
      // Also set class for compatibility
      if (colorMode === 'dark') {
        htmlElement.classList.add('dark');
      } else {
        htmlElement.classList.remove('dark');
      }
    }
  }, [colorMode]);

  return (
    <>
      <Head>
        {/* Font preloading for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Ensure theme is applied immediately before hydration - sync with Docusaurus theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Docusaurus stores theme preference in localStorage
                  var stored = localStorage.getItem('theme');
                  var theme = stored || 'dark';
                  // Set data-theme attribute immediately
                  document.documentElement.setAttribute('data-theme', theme);
                  // Also set class for compatibility
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  // Fallback to dark if localStorage fails
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </Head>
      {children}
    </>
  );
}
