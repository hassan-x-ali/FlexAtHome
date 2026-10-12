'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AccountControl } from '@/components/auth/AccountControl';
import { NAV_ITEMS, isActiveRoute } from '@/lib/navigation/items';

/**
 * Reads the current pathname without `usePathname`.
 *
 * `usePathname` opts its entire subtree into client-side rendering, which would
 * strip the server-rendered content of every page. Reading `window.location`
 * in an effect keeps this component interactive while letting the page itself
 * stay in the server graph.
 */
const useCurrentPath = (): string => {
  const [path, setPath] = useState('');

  useEffect(() => {
    const read = () => setPath(window.location.pathname);
    read();
    // Next App Router navigations do not reload the page, so poll-free
    // updates come from the History API.
    const onPopState = () => read();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return path;
};

const Brand = () => (
  <span className="flex items-center gap-2.5">
    <span
      aria-hidden="true"
      className="flex size-7 items-center justify-center rounded-sm bg-accent text-sm font-black text-bg"
    >
      F
    </span>
    <span className="text-base font-bold tracking-tight">
      FlexAt<span className="text-accent">Home</span>
    </span>
  </span>
);

/**
 * Desktop sidebar. Renders as a `<nav>` with an `aria-current="page"` marker on
 * the active link, which is how screen readers announce position.
 */
export const Sidebar = () => {
  const items = NAV_ITEMS;
  const pathname = useCurrentPath();

  return (
    <nav
      aria-label="Main"
      className="hidden shrink-0 border-r border-line bg-card/40 lg:flex lg:w-60 lg:flex-col"
    >
      <div className="flex h-16 shrink-0 items-center border-b border-line px-5">
        <Link href="/" className="rounded-sm focus-visible:outline-2 focus-visible:outline-accent">
          <Brand />
        </Link>
      </div>
      <ul className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:bg-card hover:text-fg'
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <AccountControl />
    </nav>
  );
};
