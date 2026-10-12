'use client';

import { TrendingUp } from 'lucide-react';
import { useCallback } from 'react';

import { ButtonLink, EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import type { WorkoutLog } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';
import { useAsync } from '@/lib/hooks/useAsync';
import { formatMinutes, formatRelativeDay, pluralise } from '@/lib/ui/format';

type LogWithCounts = WorkoutLog & { exerciseCount: number };

export const ProgressView = () => {
  const load = useCallback(async (): Promise<LogWithCounts[]> => {
    const backend = getBackend();
    const recent = await backend.logs.listRecent(100);
    // Entry counts are only needed for display, so failures are non-fatal.
    return Promise.all(
      recent.map(async (log): Promise<LogWithCounts> => {
        try {
          const full = await backend.logs.getById(log.id);
          return { ...log, exerciseCount: full?.exercises.length ?? 0 };
        } catch {
          return { ...log, exerciseCount: 0 };
        }
      }),
    );
  }, []);

  const { data: loadedLogs, error: detail, loading: isLoading, reload } =
    useAsync<LogWithCounts[]>(load);
  const logs = loadedLogs ?? [];

  if (detail) {
    return (
      <ErrorState
        title="Could not load your progress"
        message="Something went wrong reading your history."
        detail={detail}
        onRetry={reload}
      />
    );
  }

  if (isLoading) {
    return (
      <SkeletonGroup label="Loading progress">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2.5 h-7 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-5 h-52 w-full" />
      </SkeletonGroup>
    );
  }

  const completed = logs.filter((log) => log.completedAt !== null);
  const totalMinutes = Math.round(
    completed.reduce((sum, log) => sum + log.durationSeconds, 0) / 60,
  );
  const totalExercises = logs.reduce((sum, log) => sum + log.exerciseCount, 0);

  if (completed.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No sessions logged yet"
        description="Finish a workout and it will show up here with your time, exercises, and week-over-week trend."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl">Progress</h1>
        <p className="mt-2 text-sm text-muted">
          Everything here comes from sessions you actually completed.
        </p>
      </header>

      <section aria-label="Totals" className="grid gap-3 sm:grid-cols-3">
        <Tile label="Sessions" value={String(completed.length)} />
        <Tile label="Total time" value={formatMinutes(totalMinutes)} />
        <Tile label="Exercises" value={String(totalExercises)} />
      </section>

      <section aria-labelledby="recent-sessions">
        <h2 id="recent-sessions" className="text-sm font-bold">
          History
        </h2>
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{formatRelativeDay(log.startedAt)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {log.completedAt === null
                    ? 'Not finished'
                    : pluralise(log.exerciseCount, 'exercise')}
                </p>
              </div>
              <span className="font-stats text-sm text-muted">
                {log.durationSeconds > 0 ? formatMinutes(Math.round(log.durationSeconds / 60)) : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <ButtonLink href="/workout" variant="secondary" size="sm">
        Train now
      </ButtonLink>
    </div>
  );
};

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-line bg-card p-4">
    <p className="text-eyebrow">{label}</p>
    <p className="font-stats mt-2.5 text-2xl font-bold leading-none">{value}</p>
  </div>
);
