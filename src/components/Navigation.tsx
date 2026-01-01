'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, Timer, BarChart3, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './Navigation.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: CalendarDays },
  { href: '/timer', label: 'Timer', icon: Timer },
  { href: '/history', label: 'History', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className={styles.mobileNav} aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(styles.mobileNavItem, isActive && styles.active)}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className={styles.mobileActiveIndicator}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}
              <Icon size={24} className={styles.navIcon} />
              <span className={styles.mobileNavLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>Effort Ledger</h1>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(styles.sidebarNavItem, isActive && styles.active)}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    className={styles.sidebarActiveIndicator}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 35,
                    }}
                  />
                )}
                <Icon size={20} className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
