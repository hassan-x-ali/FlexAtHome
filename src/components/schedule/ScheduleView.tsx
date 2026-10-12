'use client';

import Link from 'next/link';
import { CalendarPlus, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect } from 'react';

import { ButtonLink, EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import type { WorkoutDayWithExercises, WorkoutPlanWithDays } from '@/lib/domain/types';
import { useAsync } from '@/lib/hooks/useAsync';
import { dayName } from '@/lib/domain/validation';
import { getBackend } from '@/lib/storage';
import { formatMinutes, formatSeconds } from '@/lib/ui/format';

const todayIndex = (): number => new Date().getDay();

/**
 * Renders the active plan, or a clear way to get one.
 *
 * Empty-state copy and the build action are injected by the screen, because
 * this component should not decide how a plan comes into being.
 */
export const ScheduleView = ({
  onNeedsPlan,
  emptyTitle,
  emptyDescription,
  emptyIcon = CalendarPlus as LucideIcon,
  loading: externallyLoading = false,
}: {
  /** Called when the user asks to build a plan. */
  onNeedsPlan?: () => void;
  /** True while the profile is still resolving, to hold the empty state. */
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: LucideIcon;
}) => {
  const load = useCallback(() => getBackend().plans.getActive(), []);
  const {
    data: plan,
    error: detail,
    loading: isLoading,
    reload,
  } = useAsync<WorkoutPlanWithDays | null>(load);

  // Keep the reference honest for consumers that mount this directly.
  useEffect(() => {
    if (plan) document.title = `${plan.name} · FlexAt Home`;
  }, [plan]);

  if (detail) {
    return (
      <ErrorState
        title="Could not load your schedule"
        message="Something went wrong reading your plan."
        detail={detail}
        onRetry={reload}
      />
    );
  }

  if (isLoading || externallyLoading) {
    return (
      <SkeletonGroup label="Loading schedule">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-5">
              <Skeleton className="h-4 w-32" />
              <Skeleton lines={[0.9, 0.6]} />
            </div>
          ))}
        </div>
      </SkeletonGroup>
    );
  }

  if (!plan) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        {...(onNeedsPlan ? { action: { label: 'Build my plan', onClick: onNeedsPlan } } : {})}
      />
    );
  }

  const today = todayIndex();
  const trainingDays = plan.days.filter((d) => !d.isRestDay);
  const weeklyMinutes = estimateWeeklyMinutes(plan.days);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        {trainingDays.length} training {trainingDays.length === 1 ? 'day' : 'days'} &middot; about{' '}
        {weeklyMinutes} min a week
      </p>

      <ol className="space-y-3">
        {plan.days.map((day) => (
          <li key={day.id}>
            <DayCard day={day} isToday={day.dayOfWeek === today} />
          </li>
        ))}
      </ol>
    </div>
  );
};

const DayCard = ({ day, isToday }: { day: WorkoutDayWithExercises; isToday: boolean }) => (
  <article
    className={`rounded-lg border bg-card p-5 ${isToday ? 'border-accent/50' : 'border-line'}`}
  >
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        {day.name}
        <span className="font-normal text-muted">{dayName(day.dayOfWeek)}</span>
        {isToday ? (
          <span className="rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-eyebrow text-accent">
            Today
          </span>
        ) : null}
      </h2>
      <p className="text-xs text-muted">
        {day.isRestDay ? 'Rest day' : `${day.exercises.length} exercises`}
      </p>
    </div>

    {day.isRestDay ? (
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Rest is part of the plan. Walking and light mobility are enough.
      </p>
    ) : (
      <>
        <ol className="mt-3.5 space-y-2.5">
          {day.exercises.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="font-stats mt-0.5 w-4 shrink-0 text-xs font-bold text-muted"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/exercise/${item.exercise.slug}`}
                  className="text-sm font-medium text-fg underline-offset-2 hover:text-accent hover:underline"
                >
                  {item.exercise.name}
                </Link>
                <p className="font-stats mt-0.5 text-xs text-muted">
                  {prescriptionLine(item.sets, item.reps, item.durationSeconds)}
                  {item.restSeconds > 0 ? ` · rest ${formatSeconds(item.restSeconds)}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4">
          <ButtonLink href={`/workout/session?day=${encodeURIComponent(day.id)}`} size="sm">
            Start this session
          </ButtonLink>
        </div>
      </>
    )}
  </article>
);

const prescriptionLine = (
  sets: number | null,
  reps: number | null,
  durationSeconds: number | null,
): string => {
  if (sets && reps) return `${sets} × ${reps}`;
  if (durationSeconds) return `${durationSeconds}s hold`;
  if (sets) return `${sets} sets`;
  return 'As prescribed';
};

/** Rough weekly total, used only as a sanity check on the plan's shape. */
const estimateWeeklyMinutes = (days: readonly WorkoutDayWithExercises[]): number => {
  const seconds = days.reduce(
    (total, day) =>
      total +
      day.exercises.reduce((dayTotal, item) => {
        const work =
          item.sets && item.reps
            ? item.sets * item.reps * 3
            : (item.durationSeconds ?? 30) * (item.sets ?? 1);
        return dayTotal + work + item.restSeconds;
      }, 0),
    0,
  );
  return Math.max(1, Math.round(seconds / 60));
};

/** Kept for callers that want a formatted estimate of a single day. */
export const estimateDayMinutes = estimateWeeklyMinutes;

/** Re-export so the screen can label a plan without importing the format module. */
export const formatPlanDuration = formatMinutes;