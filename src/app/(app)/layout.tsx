import type { Metadata } from 'next';

import { AppShell } from '@/components/layout/AppShell';
import { FirstRunGate } from '@/components/onboarding/FirstRunGate';

export const metadata: Metadata = {
  title: 'FlexAt Home',
};

/**
 * The signed-in app shell. Pages inside it stay Server Components and keep
 * their pre-rendered HTML; only the navigation, storage notice, and the
 * profile gate are client.
 *
 * The gate is mounted here so the whole app shares one profile read, and so an
 * unfinished onboarding redirects from anywhere. It renders children
 * immediately and redirects in an effect, so it never withholds server HTML.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirstRunGate>
      <AppShell>{children}</AppShell>
    </FirstRunGate>
  );
}
