import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'anchorpipe - Flaky Test Management',
  description: 'Open-source platform for flaky test management that is CI-native, transparent, and actionable',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
