import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { HydrationHandler } from '@/components/HydrationHandler';
import { AppShell } from '@/components/AppShell';
import styles from './layout.module.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export const metadata: Metadata = {
  title: 'Effort Ledger',
  description: 'Track intentional effort toward your quotas',
  manifest: '/EffortTracker/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Effort Ledger',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HydrationHandler />
        <div className={styles.layout}>
          <Navigation />
          <AppShell>
            <main className={styles.main}>{children}</main>
          </AppShell>
        </div>
      </body>
    </html>
  );
}
