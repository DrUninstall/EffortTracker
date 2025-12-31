import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { HydrationHandler } from '@/components/HydrationHandler';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Effort Ledger',
  description: 'Track intentional effort toward your quotas',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
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
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
