'use client';

import { CalendarDays, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { ScheduleView } from '@/components/schedule/ScheduleView';
import { useProfileGate } from '@/components/onboarding/FirstRunGate';
import { Button, ErrorState } from '@/components/ui';
import type { Exercise } from '@/lib/domain/types';
import type { GeneratorInput } from '@/lib/generator/rules';
import { generatePlan } from '@/lib/generator/rules';
import { getBackend, StorageError } from '@/lib/storage';
import type { LucideIcon } from 'lucide-react';
import { primaryGoalLabels } from '@/lib/domain/validation';

/**
 * The schedule screen.
 *
 * Owns plan generation and then renders whatever the active plan turns out to
 * be. Generation goes through the same storage adapter as everything else, so
 * a generated plan is indistinguishable from one the user assembled by hand.
 */
export const ScheduleScreen = () => {
  // The gate resolves the profile once for the whole app; wait for it before
  // deciding there is no plan, so a first-time visitor never sees an empty
  // schedule for a moment just because the profile is still loading.
  const { profile, loading: profileLoading } = useProfileGate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<number>(0);

  const generate = useCallback(async () => {
    if (!profile) {
      // A missing profile while still loading is not an error; the gate will
      // redirect to onboarding if the profile is genuinely absent.
      if (!profileLoading) setError('Finish onboarding first so we know what to build.');
      return;
    }
    setGenerating(true);
    setError(null);
    setErrorDetail(null);

    try {
      const backend = getBackend();

      // The catalog comes from the adapter, not the seed module, so a cloud
      // catalog is used when one exists.
      const catalog: Exercise[] = await backend.exercises.list();

      const input: GeneratorInput = {
        fitnessLevel: profile.fitnessLevel,
        primaryGoal: profile.primaryGoal,
        preferredIntensity: profile.preferredIntensity,
        preferredDuration: profile.preferredDuration,
        workoutDaysPerWeek: profile.workoutDaysPerWeek,
        movementsToAvoid: profile.movementsToAvoid,
      };

      // Replace the existing plan rather than adding another, so repeated
      // rebuilds do not pile up near-identical plans in history.
      const existing = await backend.plans.getActive();
      const draft = generatePlan(catalog, {
        ...input,
        ...(existing ? { replacePlanId: existing.id } : {}),
      });
      await backend.plans.save(draft);

      // Remount the schedule view so it reads the new plan.
      setGeneratedAt(Date.now());
    } catch (caught) {
      setError(
        caught instanceof StorageError
          ? caught.message
          : 'Could not build a plan. Please try again.',
      );
      setErrorDetail(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setGenerating(false);
    }
  }, [profile, profileLoading]);

  if (error) {
    return (
      <ErrorState
        title="Could not build your plan"
        message={error}
        {...(errorDetail ? { detail: errorDetail } : {})}
        onRetry={generate}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl">Your week</h1>
        <p className="mt-1.5 text-sm text-muted">
          {profile ? (
            <>
              Built for {primaryGoalLabels[profile.primaryGoal].toLowerCase()},{' '}
              {profile.workoutDaysPerWeek} {profile.workoutDaysPerWeek === 1 ? 'day' : 'days'} a week, about {profile.preferredDuration} minutes
              a session.
            </>
          ) : (
            'Build your first plan from your onboarding answers.'
          )}
        </p>
        </div>
        <Button variant="secondary" size="sm" onClick={generate} disabled={generating}>
          {generating ? (
            <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Wand2 className="size-3.5" aria-hidden="true" />
          )}
          {generating ? 'Building…' : 'Rebuild plan'}
        </Button>
      </div>

      {generatedAt > 0 ? (
        <p role="status" className="flex items-center gap-2 text-xs text-accent">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Plan rebuilt from your profile.
        </p>
      ) : null}

      <ScheduleView
        key={generatedAt}
        loading={profileLoading}
        onNeedsPlan={generate}
        emptyTitle="No plan yet"
        emptyDescription="We will build one from your onboarding answers: the days you can train, your level, your goal, and how long you like to train for. You can rebuild it whenever your answers change."
        emptyIcon={CalendarDays as unknown as LucideIcon}
      />
    </div>
  );
};
