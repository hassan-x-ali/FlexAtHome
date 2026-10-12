import { CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { EmptyState } from '@/components/ui';
import type { WorkoutDayWithExercises } from '@/lib/domain/types';
import { dayName } from '@/lib/domain/validation';
import { formatMinutes } from '@/lib/ui/format';

const todayIndex = (): number => new Date().getDay();

/** Finds today's session, falling back to the next upcoming training day. */
export const pickTodaysSession = (
  days: readonly WorkoutDayWithExercises[],
): { day: WorkoutDayWithExercises; isToday: boolean } | null => {
  const training = days.filter((day) => !day.isRestDay);
  if (training.length === 0) return null;

  const today = todayIndex();
  const todayMatch = training.find((day) => day.dayOfWeek === today);
  if (todayMatch) return { day: todayMatch, isToday: true };

  const upcoming = training.find((day) => day.dayOfWeek > today) ?? training[0];
  return upcoming ? { day: upcoming, isToday: false } : null;
};

/** Ready to start, or an honest empty state when there is no plan. */
export const WorkoutEntry = ({
  days,
}: {
  days: readonly WorkoutDayWithExercises[] | null;
}) => {
  const router = useRouter();

  if (!days) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No plan to train"
        description="Workout mode runs a plan — timed sets, rest periods, and a log at the end. Build one first and it will be waiting here."
      />
    );
  }

  const picked = pickTodaysSession(days);
  if (!picked) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="This plan has no training days"
        description="Every day in your plan is marked as rest. Rebuild the plan to add at least one training day."
      />
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-card p-5">
        <p className="text-eyebrow">{picked.isToday ? 'Today' : 'Next session'}</p>
        <h1 className="mt-2 text-2xl sm:text-3xl">{picked.day.name}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {dayName(picked.day.dayOfWeek)} &middot; {picked.day.exercises.length} exercises
        </p>

        <ol className="mt-5 space-y-3">
          {picked.day.exercises.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-2.5"
            >
              <span
                aria-hidden="true"
                className="font-stats flex size-6 shrink-0 items-center justify-center rounded-sm border border-line bg-card text-xs font-bold text-accent"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.exercise.name}
              </span>
              <span className="font-stats shrink-0 text-xs text-muted">
                {item.sets && item.reps
                  ? `${item.sets}×${item.reps}`
                  : item.durationSeconds
                    ? `${item.durationSeconds}s`
                    : '—'}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => router.push(`/workout/session?day=${encodeURIComponent(picked.day.id)}`)}
          className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-semibold text-bg transition-colors hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Start session
        </button>
        <p className="mt-2.5 text-center text-xs text-muted">
          Estimated {formatMinutes(estimateMinutes(picked.day))} with rest included.
        </p>
      </section>
    </div>
  );
};

const estimateMinutes = (day: WorkoutDayWithExercises): number =>
  Math.round(
    day.exercises.reduce(
      (total, item) => {
        const work = item.sets && item.reps ? item.sets * item.reps * 3 : (item.durationSeconds ?? 30);
        return total + work + item.restSeconds;
      },
      0,
    ) / 60,
  );
