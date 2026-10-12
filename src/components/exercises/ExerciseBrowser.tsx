'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { Button, EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useAsync } from '@/lib/hooks/useAsync';
import type { Exercise, FitnessLevel } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';
import { DURATION_BUCKETS, type DurationBucket, type ExerciseQuery } from '@/lib/storage/types';
import {
  BODY_PARTS_FOR_FILTER,
  bodyPartLabel,
  DIFFICULTY_ORDER,
  DURATION_BUCKETS_WITH_RESULTS,
  durationBucketLabel,
  EXERCISE_TYPES_FOR_FILTER,
  exerciseTypeLabel,
  muscleLabel,
  MUSCLES_FOR_FILTER,
} from '@/lib/ui/labels';
import { fitnessLevelLabels } from '@/lib/domain/validation';

type Status = 'loading' | 'ready' | 'error';

/**
 * The library. Filtering happens through the storage adapter rather than in the
 * component, so the local and cloud backends cannot drift in behaviour.
 *
 * Filters are mirrored into the URL so a filtered view is linkable and the
 * back button behaves.
 */
export const ExerciseBrowser = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state is seeded from the URL once, then owned by local state so the
  // controls stay responsive. The seed is a lazy initialiser rather than an
  // effect, which avoids a cascading render on mount.
  const [urlSeed] = useState(() => ({
    term: searchParams.get('q') ?? '',
    bodyParts: (searchParams.get('body') ?? '').split(',').filter(Boolean),
    muscles: (searchParams.get('muscle') ?? '').split(',').filter(Boolean),
    difficulties: (searchParams.get('level') ?? '')
      .split(',')
      .filter((v): v is FitnessLevel => DIFFICULTY_ORDER.includes(v as FitnessLevel)),
    types: (searchParams.get('type') ?? '').split(',').filter(Boolean),
    durations: (searchParams.get('time') ?? '')
      .split(',')
      .filter((v): v is DurationBucket => DURATION_BUCKETS.includes(v as DurationBucket)),
  }));

  const [term, setTerm] = useState(urlSeed.term);
  const [debouncedTerm, setDebouncedTerm] = useState(urlSeed.term);
  const [bodyParts, setBodyParts] = useState<string[]>(urlSeed.bodyParts);
  const [muscles, setMuscles] = useState<string[]>(urlSeed.muscles);
  const [difficulties, setDifficulties] = useState<FitnessLevel[]>(urlSeed.difficulties);
  const [types, setTypes] = useState<string[]>(urlSeed.types);
  const [durations, setDurations] = useState<DurationBucket[]>(urlSeed.durations);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce the search box so typing does not issue a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const query: ExerciseQuery = useMemo(
    () => ({
      search: debouncedTerm.trim() || undefined,
      bodyParts: bodyParts.length > 0 ? bodyParts : undefined,
      muscles: muscles.length > 0 ? muscles : undefined,
      difficulty: difficulties.length > 0 ? difficulties : undefined,
      types: types.length > 0 ? types : undefined,
      durationBuckets: durations.length > 0 ? durations : undefined,
    }),
    [debouncedTerm, bodyParts, muscles, difficulties, types, durations],
  );

  const load = useCallback(() => getBackend().exercises.list(query), [query]);
  const {
    data: exercises,
    error: errorDetail,
    loading: isLoading,
    reload,
  } = useAsync<Exercise[]>(load);

  const status: Status = isLoading ? 'loading' : errorDetail ? 'error' : 'ready';
  const rows = exercises ?? [];

  // Keep the URL in step with the filters. Derived during render and written in
  // an effect, so the effect only touches the router (an external system).
  const urlSignature = [
    debouncedTerm.trim(),
    bodyParts.join(','),
    muscles.join(','),
    difficulties.join(','),
    types.join(','),
    durations.join(','),
  ].join('|');
  useEffect(() => {
    const [termPart, bodyPart, musclePart, levelPart, typePart, timePart] = urlSignature.split('|');
    const params = new URLSearchParams();
    if (termPart) params.set('q', termPart);
    if (bodyPart) params.set('body', bodyPart);
    if (musclePart) params.set('muscle', musclePart);
    if (levelPart) params.set('level', levelPart);
    if (typePart) params.set('type', typePart);
    if (timePart) params.set('time', timePart);
    const next = params.toString();
    router.replace(next ? `/exercises?${next}` : '/exercises', { scroll: false });
  }, [urlSignature, router]);

  const toggle = <T extends string>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const activeFilterCount =
    bodyParts.length + muscles.length + difficulties.length + types.length + durations.length;
  const clearAll = () => {
    setBodyParts([]);
    setMuscles([]);
    setDifficulties([]);
    setTypes([]);
    setDurations([]);
    setTerm('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="exercise-search" className="sr-only">
            Search exercises
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              id="exercise-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search push-up, squat, core…"
              className="h-11 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="exercise-filters"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 font-stats text-xs text-accent">{activeFilterCount}</span>
          ) : null}
        </Button>
      </div>

      {showFilters ? (
        <section
          id="exercise-filters"
          aria-label="Filters"
          className="space-y-4 rounded-lg border border-line bg-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold">Narrow it down</h2>
            {activeFilterCount > 0 || term ? (
              <Button size="sm" variant="ghost" onClick={clearAll}>
                <X className="size-3.5" aria-hidden="true" />
                Clear
              </Button>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Level
            </legend>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_ORDER.map((level) => {
                const active = difficulties.includes(level);
                return (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(difficulties, level, setDifficulties)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {fitnessLevelLabels[level]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Body part
            </legend>
            <div className="flex flex-wrap gap-2">
              {BODY_PARTS_FOR_FILTER.map((part) => {
                const active = bodyParts.includes(part);
                return (
                  <button
                    key={part}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(bodyParts, part, setBodyParts)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {bodyPartLabel(part)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Primary muscle
            </legend>
            <div className="flex flex-wrap gap-2">
              {MUSCLES_FOR_FILTER.map((muscle) => {
                const active = muscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(muscles, muscle, setMuscles)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {muscleLabel(muscle)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Movement type
            </legend>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_TYPES_FOR_FILTER.map((type) => {
                const active = types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(types, type, setTypes)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {exerciseTypeLabel(type)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Hold duration
            </legend>
            <div className="flex flex-wrap gap-2">
              {DURATION_BUCKETS_WITH_RESULTS.map((bucket) => {
                const active = durations.includes(bucket);
                return (
                  <button
                    key={bucket}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(durations, bucket, setDurations)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-surface text-muted hover:text-fg'
                    }`}
                  >
                    {durationBucketLabel(bucket)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              Timed holds only. Movements prescribed in reps have no duration and are left out.
            </p>
          </fieldset>
        </section>
      ) : null}

      <p aria-live="polite" className="text-xs text-muted">
        {status === 'loading'
          ? 'Loading exercises…'
          : `${rows.length} ${rows.length === 1 ? 'exercise' : 'exercises'}`}
      </p>

      {status === 'error' ? (
        <ErrorState
          title="Could not load the library"
          message="Something went wrong reading the exercise catalog."
          {...(errorDetail ? { detail: errorDetail } : {})}
          onRetry={reload}
        />
      ) : null}

      {status === 'loading' ? (
        <SkeletonGroup label="Loading exercises">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="rounded-lg border border-line bg-card p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="mt-3" lines={[1, 0.7, 0.5]} />
              </li>
            ))}
          </ul>
        </SkeletonGroup>
      ) : null}

      {status === 'ready' && rows.length === 0 ? (
        <EmptyState
          title="No exercises match"
          description={
            debouncedTerm.trim() || activeFilterCount > 0
              ? 'Try a different search term, or remove a filter to widen the results.'
              : 'The catalog is empty.'
          }
          {...(activeFilterCount > 0 || debouncedTerm.trim()
            ? { action: { label: 'Clear filters', onClick: clearAll } }
            : {})}
        />
      ) : null}

      {status === 'ready' && rows.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((exercise) => (
            <li key={exercise.id}>
              <ExerciseCard exercise={exercise} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
