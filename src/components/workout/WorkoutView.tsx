'use client';

import { useCallback } from 'react';

import { WorkoutEntry } from '@/components/workout/WorkoutEntry';
import { ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import type { WorkoutDayWithExercises } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';
import { useAsync } from '@/lib/hooks/useAsync';

export const WorkoutView = () => {
  const load = useCallback(
    async () => (await getBackend().plans.getActive())?.days ?? [],
    [],
  );
  const { data: days, error: detail, loading: isLoading, reload } = useAsync<WorkoutDayWithExercises[]>(load);

  if (detail) {
    return (
      <ErrorState
        title="Could not load your workout"
        message="Something went wrong reading your plan."
        detail={detail}
        onRetry={reload}
      />
    );
  }

  if (isLoading) {
    return (
      <SkeletonGroup label="Loading workout">
        <div className="rounded-lg border border-line bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-48" />
          <Skeleton className="mt-6" lines={[0.9, 0.9, 0.9, 0.9]} />
        </div>
      </SkeletonGroup>
    );
  }

  return <WorkoutEntry days={days} />;
};
