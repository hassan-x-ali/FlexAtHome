'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useAsync } from '@/lib/hooks/useAsync';
import type { BodyPart, Exercise, FitnessLevel, PrimaryGoal, Profile } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';
import { RANKED_BODY_PARTS, rankExercisesFor } from '@/lib/exercises/ranking';
import { bodyPartLabel } from '@/lib/ui/labels';
import { fitnessLevelLabels } from '@/lib/domain/validation';

type Status = 'loading' | 'ready' | 'error';

const BODY_PART_TABS = RANKED_BODY_PARTS;

const GOAL_LABELS: Record<PrimaryGoal, string> = {
  general_fitness: 'general fitness',
  strength: 'strength',
  muscle: 'muscle',
  endurance: 'endurance',
  weight_loss: 'weight loss',
  mobility: 'mobility',
  consistency: 'consistency',
};

/**
 * "Best exercises for X".
 *
 * Deliberately phrased as options for one person rather than a verdict. The
 * heading says "suitable for you" and every card shows why it was picked, so
 * nothing here implies a single universally best exercise.
 */
export const BestExercises = () => {
  const router = useRouter();
  const [part, setPart] = useState<BodyPart>('chest');

  const load = useCallback(async () => {
    const backend = getBackend();
    const exercises = await backend.exercises.list();
    // The profile is optional context, not a requirement. In cloud mode a
    // signed-out visitor cannot read their own row, and `profiles.get` throws
    // for that case by design, so this must not take the catalog down with it.
    let profile: Profile | null = null;
    try {
      profile = await backend.profiles.get();
    } catch {
      profile = null;
    }
    return { profile, exercises };
  }, []);

  const { data, error: errorDetail, loading: isLoading, reload } = useAsync<{
    profile: Profile | null;
    exercises: Exercise[];
  }>(load);

  const status: Status = isLoading ? 'loading' : errorDetail ? 'error' : 'ready';

  const ranked = useMemo(() => {
    if (!data) return [];
    // Straight from the adapter, in both local and cloud mode. Importing the
    // seed here would drag the whole catalog and its dev-time validator into a
    // client bundle for no benefit.
    return rankExercisesFor(
      data.exercises,
      part,
      {
        level: data.profile?.fitnessLevel ?? null,
        goal: data.profile?.primaryGoal ?? null,
        avoid: data.profile?.movementsToAvoid ?? [],
      },
      6,
    );
  }, [data, part]);

  const level: FitnessLevel | null = data?.profile?.fitnessLevel ?? null;
  const goal: PrimaryGoal | null = data?.profile?.primaryGoal ?? null;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold">Best exercises for you</h2>
        <p className="text-sm text-muted">
          {level ? (
            <>
              Ordered for a {fitnessLevelLabels[level].toLowerCase()} level
              {goal ? ` with a ${GOAL_LABELS[goal]} focus` : ''}. These are options that fit
              where you are now, not a verdict on what is best.
            </>
          ) : (
            <>
              A general starting order. Complete onboarding and this ranks by your level and
              goal, and hides anything harder than where you are.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a body part">
        {BODY_PART_TABS.map((value) => {
          const active = value === part;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setPart(value)}
              className={`rounded-sm border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line bg-surface text-muted hover:text-fg'
              }`}
            >
              {bodyPartLabel(value)}
            </button>
          );
        })}
      </div>

      {status === 'error' ? (
        <ErrorState
          title="Could not build suggestions"
          message="Something went wrong reading your profile and the catalog."
          {...(errorDetail ? { detail: errorDetail } : {})}
          onRetry={reload}
        />
      ) : null}

      {status === 'loading' ? (
        <SkeletonGroup label="Loading suggestions">
          <ul className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="rounded-lg border border-line bg-card p-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3" lines={[1, 0.6]} />
              </li>
            ))}
          </ul>
        </SkeletonGroup>
      ) : null}

      {status === 'ready' && ranked.length === 0 ? (
        <EmptyState
          title="Nothing to suggest here yet"
          description={
            level
              ? 'Every catalog entry for this body part is above your level or on your avoid list. Try another body part, or update your profile.'
              : 'The catalog has no entries for this body part.'
          }
          {...(level
            ? {
                action: {
                  label: 'Browse everything',
                  onClick: () => router.push('/exercises'),
                },
              }
            : {})}
        />
      ) : null}

      {status === 'ready' && ranked.length > 0 ? (
        <ol className="space-y-2">
          {ranked.map((entry, index) => (
            <li key={entry.exercise.id}>
              <Link
                href={`/exercise/${entry.exercise.slug}`}
                className="block rounded-lg border border-line bg-card p-4 transition-colors hover:border-accent/60"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 font-stats text-sm text-accent">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{entry.exercise.name}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {fitnessLevelLabels[entry.exercise.difficulty]}
                      {entry.exercise.recommendedReps
                        ? ` · ${entry.exercise.recommendedSets ?? 3} x ${entry.exercise.recommendedReps} reps`
                        : null}
                      {entry.exercise.recommendedDurationSeconds
                        ? ` · ${entry.exercise.recommendedDurationSeconds}s holds`
                        : null}
                    </p>
                    {entry.reasons.length > 0 ? (
                      <ul className="mt-2 space-y-0.5">
                        {entry.reasons.map((reason) => (
                          <li key={reason} className="flex items-start gap-1.5 text-xs text-muted">
                            <Sparkles className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      {status === 'ready' && level ? (
        <p className="text-xs text-muted">
          Anything harder than {fitnessLevelLabels[level].toLowerCase()} is hidden, along with
          movements on your avoid list.
        </p>
      ) : null}
    </div>
  );
};
