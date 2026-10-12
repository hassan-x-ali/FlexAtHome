import Link from 'next/link';

import { AccountControl } from '@/components/auth/AccountControl';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';

/**
 * The signed-in app shell: sidebar on desktop, bottom bar on mobile, and a
 * main region that reserves bottom padding so the bar never covers content.
 *
 * This is a Server Component. The navigation and the storage banner are the
 * only client parts; `children` are the page's own server-rendered output and
 * are never handed to a client component as a prop, which would strip the
 * page of its pre-rendered HTML.
 */
export const AppShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-dvh bg-bg">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-line px-5 lg:hidden">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-sm bg-accent text-sm font-black text-bg"
          >
            F
          </span>
          <span className="text-base font-bold tracking-tight">
            FlexAt<span className="text-accent">Home</span>
          </span>
        </Link>
        <AccountControl />
      </header>
      <main id="main" className="flex-1 px-5 pt-6 pb-24 lg:px-8 lg:pb-10">
        {children}
      </main>
    </div>
    <BottomNav />
  </div>
);
