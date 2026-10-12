import Link from 'next/link';

import { FOOTER_LINKS, SAFETY_DISCLAIMER } from '@/lib/landing/content';

export const LandingFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="py-12">
      <div className="container-page">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-base font-bold">
              FlexAt<span className="text-accent">Home</span>
            </p>
            <p className="mt-2.5 max-w-sm text-sm leading-relaxed text-muted">
              Equipment-free home training. Built for a floor, a wall, and about twenty minutes.
            </p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h2 className="text-eyebrow">{group.heading}</h2>
              <ul className="mt-3.5 space-y-2.5">
                {group.links.map((link) => (
                  <li key={`${group.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-3xl rounded-md border border-line bg-card/40 p-4 text-xs leading-relaxed text-muted">
          {SAFETY_DISCLAIMER}
        </p>

        <p className="mt-6 text-xs text-muted">
          &copy; {year} FlexAt Home. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
