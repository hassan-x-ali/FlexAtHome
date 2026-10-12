'use client';

import { Pause, Play, SkipForward, Square, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, Dialog, ErrorState } from '@/components/ui';
import type { WorkoutDayWithExercises, WorkoutExercise } from '@/lib/domain/types';
import { getBackend, StorageError } from '@/lib/storage';
import { formatClock, formatSeconds } from '@/lib/ui/format';

type Phase = 'ready' | 'running' | 'paused' | 'rest' | 'done' | 'error';

type Props = {
  day: WorkoutDayWithExercises;
};

type Step = {
  index: number;
  item: WorkoutExercise & { exercise: { name: string; slug: string } };
  setNumber: number;
  totalSets: number;
};

/**
 * Workout mode.
 *
 * The timer is derived from an absolute target timestamp rather than an
 * incrementing counter, so a throttled background tab or a slow interval tick
 * cannot make the session drift.
 */
export const WorkoutSession = ({ day }: Props) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('ready');
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [saving, setSaving] = useState(false);

  const logIdRef = useRef<string | null>(null);
  const targetRef = useRef<number>(0);
  const restTargetRef = useRef<number>(0);

  const steps: Step[] = day.exercises.flatMap((item) => {
    const totalSets = item.sets && item.sets > 0 ? item.sets : 1;
    return Array.from({ length: totalSets }, (_, setNumber) => ({
      index: item.orderIndex,
      item,
      setNumber: setNumber + 1,
      totalSets,
    }));
  });

  const progressPct = steps.length > 0 ? Math.round((stepIndex / steps.length) * 100) : 0;

  const motivationalLine = (() => {
    const lines = [
      'Keep breathing. Stop if anything hurts.',
      'You are stronger than yesterday.',
      'One set at a time.',
      'Consistency beats intensity.',
      'Progress, not perfection.',
      'You are building this.',
      'Breathe. Move. Repeat.',
      'You started this for a reason.',
      'Every rep counts.',
      'You have got this.',
    ];
    const idx = stepIndex % lines.length;
    return lines[idx];
  })();

  const current = steps[stepIndex];
  const workSeconds = useCallback(
    (item: WorkoutExercise): number => {
      if (item.durationSeconds) return item.durationSeconds;
      if (item.reps) return Math.min(item.reps * 3, 180);
      return 30;
    },
    [],
  );

  const advance = useCallback(() => {
    setStepIndex((currentIndex) => {
      if (currentIndex + 1 >= steps.length) {
        setPhase('done');
        return currentIndex;
      }
      const next = steps[currentIndex + 1];
      if (!next) return currentIndex;
      targetRef.current = Date.now() + workSeconds(next.item) * 1000;
      setRemaining(workSeconds(next.item));
      setPhase('running');
      return currentIndex + 1;
    });
  }, [steps, workSeconds]);

  // --- ticking ------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'running' && phase !== 'rest') return;
    const id = window.setInterval(() => {
      const target = phase === 'rest' ? restTargetRef.current : targetRef.current;
      const left = Math.max(0, Math.round((target - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        if (phase === 'rest') {
          advance();
        } else {
          const restSeconds = current?.item.restSeconds ?? 0;
          restTargetRef.current = Date.now() + restSeconds * 1000;
          setRemaining(restSeconds);
          setPhase('rest');
        }
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, stepIndex, current, advance]);

  // --- log lifecycle ------------------------------------------------------
  const beginLog = useCallback(async () => {
    const backend = getBackend();
    const log = await backend.logs.start({
      workoutPlanId: day.workoutPlanId,
      workoutDayId: day.id,
      startedAt: new Date().toISOString(),
    });
    logIdRef.current = log.id;
    return log;
  }, [day.workoutPlanId, day.id]);

  const start = async () => {
    setErrorMessage(null);
    try {
      if (!logIdRef.current) await beginLog();
      if (current) {
        targetRef.current = Date.now() + workSeconds(current.item) * 1000;
        setRemaining(workSeconds(current.item));
      }
      setPhase('running');
    } catch (error) {
      setErrorMessage(
        error instanceof StorageError ? error.message : 'Could not start the workout.',
      );
      setPhase('error');
    }
  };

  const finish = async () => {
    const logId = logIdRef.current;
    setSaving(true);
    try {
      if (logId) {
        const backend = getBackend();
        // Persist what was actually reached, not what was planned.
        for (const step of steps.slice(0, stepIndex + 1)) {
          await backend.logs.logExercise(
            {
              exerciseId: step.item.exerciseId,
              setsCompleted: step.setNumber,
              repsCompleted: step.item.reps ?? 0,
              durationSeconds: workSeconds(step.item),
              notes: '',
            },
            logId,
          );
        }
        await backend.logs.complete(logId, {
          completedAt: new Date().toISOString(),
          durationSeconds: 0,
        });
      }
      setPhase('done');
      router.push('/progress');
    } catch (error) {
      setErrorMessage(
        error instanceof StorageError ? error.message : 'Could not save the session.',
      );
      setPhase('error');
    } finally {
      setSaving(false);
    }
  };

  const quit = async () => {
    const logId = logIdRef.current;
    if (logId) {
      try {
        await getBackend().logs.abandon(logId);
      } catch {
        // Abandoning is best-effort; a stale incomplete log is harmless.
      }
    }
    setConfirmExit(false);
    router.push('/workout');
  };

  // --- render -------------------------------------------------------------

  if (phase === 'error') {
    return (
      <ErrorState
        title="Workout stopped"
        message={errorMessage ?? 'Something went wrong.'}
        detail="No progress was saved."
        onRetry={() => router.push('/workout')}
        retryLabel="Back to workout"
      />
    );
  }

  if (phase === 'done') {
    const doneSteps = steps.slice(0, stepIndex + 1);
    const doneExercises = new Set(doneSteps.map((s) => s.item.exerciseId)).size;
    const doneSets = doneSteps.length;
    const totalSeconds = doneSteps.reduce(
      (total, s) => total + workSeconds(s.item) + s.item.restSeconds,
      0,
    );
    return (
      <div className="rounded-lg border border-line bg-card p-6 text-center">
        <h1 className="text-2xl">Session saved</h1>
        <p className="mt-2 text-sm text-muted">
          It is in your history. Consistency beats intensity anyway.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-surface p-3">
            <dt className="text-eyebrow text-muted">Exercises</dt>
            <dd className="mt-1 font-stats text-xl font-bold">{doneExercises}</dd>
          </div>
          <div className="rounded-md bg-surface p-3">
            <dt className="text-eyebrow text-muted">Sets</dt>
            <dd className="mt-1 font-stats text-xl font-bold">{doneSets}</dd>
          </div>
          <div className="rounded-md bg-surface p-3">
            <dt className="text-eyebrow text-muted">Time</dt>
            <dd className="mt-1 font-stats text-xl font-bold">
              {Math.max(1, Math.round(totalSeconds / 60))}m
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex justify-center gap-3">
          <Button onClick={() => router.push('/progress')}>View progress</Button>
          <Button variant="secondary" onClick={() => router.push('/workout')}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            {day.name} &middot; set {current ? current.setNumber : 0} of{' '}
            {current ? current.totalSets : 0}
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Workout progress"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmExit(true)}
          aria-label="Leave workout"
          className="rounded-sm p-1.5 text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="rounded-lg border border-line bg-card p-8 text-center">
        <p className="text-eyebrow">{phase === 'rest' ? 'Rest' : 'Working'}</p>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-fg">
            {current?.item.exercise.name ?? 'Session complete'}
          </p>
          {current && (current.item as unknown as { exercise?: { description?: string } }).exercise?.description && (
            <p className="text-xs text-muted">{(current.item as unknown as { exercise?: { description?: string } }).exercise?.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted">
            <div>
              {current?.item.reps ? (
                <>
                  Sets: <span className="font-medium">{current?.setNumber}</span> / <span className="font-medium">{current?.totalSets}</span>{' '}
                  Reps: <span className="font-medium">{current?.item.reps}</span>
                </>
              ) : (
                <>
                  Time: <span className="font-medium">{formatSeconds(current?.item.durationSeconds ?? 0)}</span>{' '}
                  Sets: <span className="font-medium">{current?.setNumber}</span> / <span className="font-medium">{current?.totalSets}</span>
                </>
              )}
            </div>
            <div>
              Rest: <span className="font-medium">{formatSeconds(current?.item.restSeconds ?? 0)}</span>
            </div>
          </div>
        </div>
        <p
          aria-live="assertive"
          aria-atomic="true"
          className="font-stats mt-4 text-5xl font-bold leading-none tabular-nums"
        >
          {phase === 'ready' ? formatClock(workSeconds(current?.item ?? ({ restSeconds: 0 } as WorkoutExercise))) : formatClock(remaining)}
        </p>
        {current?.item.reps && current.item.reps > 0 ? (
          <p className="mt-2 font-stats text-sm text-muted">
            {current.item.reps} reps × {current.setNumber} sets
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3">
        {phase === 'ready' ? (
          <Button size="lg" onClick={start} block>
            <Play className="size-4" aria-hidden="true" />
            Start
          </Button>
        ) : (
          <>
            <Button
              size="lg"
              onClick={() => setPhase(phase === 'running' ? 'paused' : 'running')}
              block
            >
              {phase === 'paused' ? (
                <>
                  <Play className="size-4" aria-hidden="true" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="size-4" aria-hidden="true" />
                  Pause
                </>
              )}
            </Button>
            <Button size="icon" variant="secondary" onClick={advance} aria-label="Skip ahead">
              <SkipForward className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={finish}
              disabled={saving}
              aria-label="Finish session"
            >
              <Square className="size-4" aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        {phase === 'paused'
          ? 'Paused. Resume when ready.'
          : phase === 'rest'
            ? `Next up in ${formatSeconds(remaining)}.`
            : motivationalLine}
      </p>

      <Dialog
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Leave this workout?"
        description="Nothing will be saved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmExit(false)}>
              Keep going
            </Button>
            <Button variant="danger" onClick={quit}>
              Leave
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          This session will be discarded. If you are only pausing, close this and use the pause
          button instead.
        </p>
      </Dialog>
    </div>
  );
};
