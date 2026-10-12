import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { HERO } from '@/lib/landing/content';
import { SignupForm } from './SignupForm';

export const Hero = () => (
  <section className="border-b border-line">
    <div className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
      <div>
        <p className="text-eyebrow">Equipment-free home training</p>
        <h1 className="mt-4 text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">{HERO.headline}</h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          {HERO.subheadline}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={HERO.primaryCta.href}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-bg transition-colors hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {HERO.primaryCta.label}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href={HERO.secondaryCta.href}
            className="inline-flex h-12 items-center justify-center rounded-md border border-line bg-card px-6 text-sm font-semibold text-fg transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {HERO.secondaryCta.label}
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
          <li>No account needed to start</li>
          <li>Works offline</li>
          <li>Nothing to buy</li>
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-card p-6">
        <h2 className="text-sm font-bold">Get new plans and exercise notes</h2>
        <p className="mt-1.5 text-sm text-muted">
          Occasional emails when we add movements or improve the guidance. Nothing else.
        </p>
        <div className="mt-5">
          <SignupForm />
        </div>
      </div>
    </div>
  </section>
);
