'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { WorkoutSession } from '@/components/workout/WorkoutSession';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/ui/Skeleton';
import type { WorkoutDayWithExercises } from '@/lib/domain/types';
import { useAsync } from '@/lib/hooks/useAsync';
import { getBackend } from '@/lib/storage';

/**
 * Resolves the day named in the query string, then hands off to the session
 * timer. Errors are phrased for the user and offer a way back.
 */
export const WorkoutSessionLoader = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dayId = searchParams.get('day');

  const load = useCallback(async (): Promise<WorkoutDayWithExercises> => {
    if (!dayId) throw new Error('No workout day was selected.');

    const found = await getBackend().plans.getDayWithExercises(dayId);
    if (!found) throw new Error('That workout day no longer exists in your plan.');
    if (found.isRestDay || found.exercises.length === 0) {
      throw new Error('That day is a rest day with no exercises.');
    }
    return found;
  }, [dayId]);

  const { data: day, error, loading } = useAsync<WorkoutDayWithExercises>(load);

  if (error) {
    return (
      <ErrorState
        title="Cannot start this session"
        message={error}
        retryLabel="Back to workout"
        onRetry={() => router.push('/workout')}
      />
    );
  }

  if (loading || !day) {
    return (
      <SkeletonGroup label="Preparing session">
        <div className="rounded-lg border border-line bg-card p-8 text-center">
          <Skeleton className="mx-auto h-3 w-24" />
          <Skeleton className="mx-auto mt-3 h-5 w-48" />
          <Skeleton className="mx-auto mt-8 h-16 w-40" />
        </div>
      </SkeletonGroup>
    );
  }

  return <WorkoutSession day={day} />;
};
