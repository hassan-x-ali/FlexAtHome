import type { ReactNode } from 'react';

import { BrandLink } from '@/components/landing/BrandLink';

/**
 * Layout for the auth screens.
 *
 * These pages sit outside the app shell and the profile gate: a signed-out user
 * has no profile, so the normal redirect logic must not apply here. Keeping them
 * in their own route group also means the app middleware still protects
 * `/profile` and friends without these screens inheriting that.
 */
export const AuthScreenShell = ({ children }: { children: ReactNode }) => (
  <main className="flex min-h-dvh flex-col bg-bg">
    <header className="px-5 py-5 sm:px-8">
      <BrandLink href="/" as="link" />
    </header>
    <div className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
      {children}
    </div>
  </main>
);
