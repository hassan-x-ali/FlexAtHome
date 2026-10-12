'use client';

import { CalendarClock, Dumbbell, Flame, TrendingUp } from 'lucide-react';
import { useCallback } from 'react';


import { ButtonLink, EmptyState, ErrorState, Skeleton, SkeletonGroup } from '@/components/ui';
import { useProfile } from '@/components/onboarding/FirstRunGate';
import { dayName } from '@/lib/domain/validation';
import type { WorkoutDayWithExercises, WorkoutLog } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';
import { useAsync } from '@/lib/hooks/useAsync';
import { formatMinutes, formatRelativeDay } from '@/lib/ui/format';
import { primaryGoalLabels, intensityLabels } from '@/lib/domain/validation';

type DashboardData = {
  todayPlan: { name: string; day: WorkoutDayWithExercises } | null;
  recentLogs: WorkoutLog[];
  weekTotalMinutes: number;
  currentStreak: number;
};

const todayIndex = (): number => new Date().getDay();

/** Consecutive days with a completed session, counting back from today. */
const computeStreak = (logs: WorkoutLog[]): number => {
  const completedDays = new Set(
    logs
      .filter((log) => log.completedAt !== null)
      .map((log) => {
        const date = new Date(log.startedAt);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      }),
  );
  if (completedDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  // Allow a grace period: today not yet trained does not break the streak.
  if (!completedDays.has(startOfDay(cursor))) cursor.setDate(cursor.getDate() - 1);

  while (completedDays.has(startOfDay(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Monday-based start of the current week. */
const startOfWeek = (): number => {
  const now = new Date();
  const weekday = (now.getDay() + 6) % 7;
  return startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday));
};

export const Dashboard = () => {
  const profile = useProfile();
  const load = useCallback(async (): Promise<DashboardData> => {
    const backend = getBackend();
    const [plan, recentLogs] = await Promise.all([
      backend.plans.getActive(),
      backend.logs.listRecent(100),
    ]);

    const today = todayIndex();
    const todayDay =
      plan?.days.find((day) => !day.isRestDay && day.dayOfWeek === today) ??
      plan?.days.find((day) => !day.isRestDay) ??
      null;

    const weekStart = startOfWeek();
    const weekTotalMinutes = Math.round(
      recentLogs
        .filter((log) => log.completedAt !== null && new Date(log.startedAt).getTime() >= weekStart)
        .reduce((sum, log) => sum + log.durationSeconds, 0) / 60,
    );

    return {
      todayPlan: plan && todayDay ? { name: plan.name, day: todayDay } : null,
      recentLogs: recentLogs.slice(0, 5),
      weekTotalMinutes,
      currentStreak: computeStreak(recentLogs),
    };
  }, []);

  const { data, error: detail, loading: isLoading, reload } = useAsync<DashboardData>(load);

  if (detail) {
    return (
      <ErrorState
        title="Could not load your dashboard"
        message="Something went wrong reading your plan and history."
        detail={detail}
        onRetry={reload}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <SkeletonGroup label="Loading dashboard">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-line bg-card p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2.5 h-7 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-line bg-card p-5">
          <Skeleton lines={[0.4, 1, 0.8, 0.6]} />
        </div>
      </SkeletonGroup>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl">
          {profile ? `Welcome back, ${profile.fullName.split(' ')[0]}` : 'Welcome back'}
        </h1>
        {profile ? (
          <p className="mt-2 text-sm text-muted">
            {primaryGoalLabels[profile.primaryGoal]} · {intensityLabels[profile.preferredIntensity]}{' '}
            · {profile.workoutDaysPerWeek} days a week · {formatMinutes(profile.preferredDuration)}{' '}
            sessions
          </p>
        ) : null}
      </header>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Flame}
          label="Current streak"
          value={data.currentStreak === 0 ? '—' : String(data.currentStreak)}
          hint={data.currentStreak === 1 ? 'day' : 'days'}
        />
        <StatTile
          icon={CalendarClock}
          label="This week"
          value={String(data.weekTotalMinutes)}
          hint="minutes done"
        />
        <StatTile
          icon={TrendingUp}
          label="Sessions logged"
          value={String(data.recentLogs.filter((l) => l.completedAt !== null).length)}
          hint="recent"
        />
      </section>

      <section aria-labelledby="today-heading" className="rounded-lg border border-line bg-card p-5">
        <h2 id="today-heading" className="text-sm font-bold">
          Today &middot; {dayName(todayIndex())}
        </h2>

        {data.todayPlan ? (
          <div className="mt-4">
            <p className="text-xs text-muted">
              {data.todayPlan.name} &middot; {data.todayPlan.day.name}
            </p>
            <ul className="mt-3 space-y-1.5">
              {data.todayPlan.day.exercises.map((item) => (
                <li key={item.id} className="flex items-center gap-2.5 text-sm">
                  <Dumbbell className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                  <span className="truncate">{item.exercise.name}</span>
                  <span className="font-stats ml-auto shrink-0 text-xs text-muted">
                    {item.sets && item.reps ? `${item.sets}×${item.reps}` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <ButtonLink href="/workout" className="mt-4">
              Start session
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              compact
              icon={CalendarClock}
              title="Nothing planned yet"
              description="Build a plan and it will show up here, matched to the days you said you can train."
            />
            <ButtonLink href="/schedule" className="mt-4">
              Build a plan
            </ButtonLink>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="text-sm font-bold">
          Recent sessions
        </h2>
        {data.recentLogs.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-line bg-card/40 p-4 text-sm text-muted">
            Nothing logged yet. Your completed sessions will appear here.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.recentLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-line bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {formatRelativeDay(log.startedAt)}
                    {log.completedAt === null ? (
                      <span className="ml-2 text-xs text-muted">(not finished)</span>
                    ) : null}
                  </p>
                  {log.notes ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{log.notes}</p>
                  ) : null}
                </div>
                <span className="font-stats shrink-0 text-sm text-muted">
                  {log.durationSeconds > 0 ? formatMinutes(Math.round(log.durationSeconds / 60)) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const StatTile = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-lg border border-line bg-card p-4">
    <p className="flex items-center gap-1.5 text-eyebrow">
      <Icon className="size-3" aria-hidden="true" />
      {label}
    </p>
    <p className="mt-2.5 font-stats text-2xl font-bold leading-none">{value}</p>
    <p className="mt-1 text-xs text-muted">{hint}</p>
  </div>
);
