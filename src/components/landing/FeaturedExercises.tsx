import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { FEATURED_EXERCISES } from '@/lib/landing/content';
import { fitnessLevelLabels, } from '@/lib/domain/validation';

/** Two-letter monogram used in place of stock photography. */
const monogram = (name: string): string =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

export const FeaturedExercises = () => (
  <section
    id="exercises"
    aria-labelledby="featured-heading"
    className="border-b border-line py-16 md:py-20"
  >
    <div className="container-page">
      <h2 id="featured-heading" className="text-2xl sm:text-3xl">
        Six to start with
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        A cross-section from the library. Each one has step-by-step instructions, form cues, the
        common mistakes, and plain notes on what it can and cannot do without equipment.
      </p>

      <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_EXERCISES.map((exercise) => (
          <li key={exercise.slug} className="group overflow-hidden rounded-lg border border-line bg-card">
            <div
              aria-hidden="true"
              className="flex h-28 items-center justify-center border-b border-line bg-surface"
            >
              <span className="font-stats text-4xl font-black text-line">{monogram(exercise.name)}</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-bold">{exercise.name}</h3>
                <span className="shrink-0 rounded-sm border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-muted">
                  {fitnessLevelLabels[exercise.difficulty] ?? exercise.difficulty}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                {exercise.blurb}
              </p>
              <Link
                href={`/exercise/${exercise.slug}`}
                className="mt-3.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                How to do it
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
