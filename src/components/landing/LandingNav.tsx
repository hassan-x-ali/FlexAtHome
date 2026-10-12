'use client';

import { BrandLink } from './BrandLink';

import { NAV_LINKS } from '@/lib/landing/content';
import { useEffect, useState } from 'react';

/**
 * Sticky marketing nav. The bottom border appears only after the page scrolls,
 * observed with an IntersectionObserver sentinel instead of a scroll listener.
 */
export const LandingNav = () => {
  const [stuck, setStuck] = useState(false);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;height:1px;width:1px;';
    document.body.prepend(sentinel);

    const observer = new IntersectionObserver(
      (entries) => setStuck(!(entries[0]?.isIntersecting ?? true)),
      { threshold: 0 },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      sentinel.remove();
    };
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.getElementById(link.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (first?.target.id) setActiveId(first.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        stuck ? 'border-line bg-bg/90 backdrop-blur-sm' : 'border-transparent'
      }`}
    >
      <nav aria-label="Marketing" className="container-page flex h-16 items-center justify-between gap-6">
        <BrandLink href="/" />
        <ul className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => {
            const id = link.href.slice(1);
            const active = activeId === id;
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={active ? 'true' : undefined}
                  className={`text-sm font-medium transition-colors hover:text-fg ${
                    active ? 'text-accent' : 'text-muted'
                  }`}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
        <a
          href="/onboarding"
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent px-4 text-sm font-semibold text-bg transition-colors hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Start free
        </a>
      </nav>
    </header>
  );
};
