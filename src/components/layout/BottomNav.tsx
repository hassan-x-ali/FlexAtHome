'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { NAV_ITEMS, isActiveRoute } from '@/lib/navigation/items';

/**
 * Reads the current pathname without `usePathname`.
 *
 * `usePathname` would opt the whole app subtree into client rendering and strip
 * the server-rendered page content. `window.location` plus the History API
 * keeps this interactive without that cost.
 */
const useCurrentPath = (): string => {
  const [path, setPath] = useState('');

  useEffect(() => {
    const read = () => setPath(window.location.pathname);
    read();
    const onPopState = () => read();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return path;
};

/**
 * Mobile bottom navigation. A `<nav>` with a list of links; the current page is
 * marked with `aria-current="page"` and a visually distinct treatment.
 *
 * Labels are always rendered, not icon-only, so targets stay unambiguous.
 */
export const BottomNav = () => {
  const items = NAV_ITEMS;
  const pathname = useCurrentPath();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-sm lg:hidden"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch">
        {items.map((item) => {
          const active = isActiveRoute(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 px-1 py-2 text-[0.6875rem] font-semibold transition-colors ${
                  active ? 'text-accent' : 'text-muted hover:text-fg'
                }`}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="leading-none">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
