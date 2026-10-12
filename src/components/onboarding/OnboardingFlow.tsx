'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { AvoidMovementsField } from '@/components/onboarding/AvoidMovementsField';
import { ChoiceGroup } from '@/components/onboarding/ChoiceGroup';
import { useProfileGate } from '@/components/onboarding/FirstRunGate';
import { Button, ErrorState, Input } from '@/components/ui';
import { onboardingSchema, type OnboardingInput } from '@/lib/domain/validation';
import {
  ageRangeOptions,
  daysPerWeekOptions,
  durationOptions,
  emptyAnswers,
  FIRST_STEP,
  fitnessLevelOptions,
  genderOptions,
  goalOptions,
  intensityOptions,
  SAFETY_LINE,
  schemaForStep,
  STEP_COUNT,
  STEP_SUBTITLES,
  STEP_TITLES,
} from '@/lib/onboarding/steps';
import { getBackend, StorageError } from '@/lib/storage';
import { generatePlan } from '@/lib/generator/rules';

/**
 * First-run onboarding.
 *
 * A single React Hook Form holds the whole answer set; each step validates only
 * its own fields with the matching per-step schema, so Back never loses data and
 * Next blocks on the current step alone. The full schema runs once on submit.
 */
export const OnboardingFlow = () => {
  const router = useRouter();
  const { refresh } = useProfileGate();
  const [step, setStep] = useState(FIRST_STEP);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitDetail, setSubmitDetail] = useState<string | null>(null);

  const {
    control,
    register,
    trigger,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: emptyAnswers(),
    mode: 'onTouched',
  });

  const stepSchema = schemaForStep[step as keyof typeof schemaForStep];
  const stepFields = Object.keys(stepSchema.shape) as (keyof OnboardingInput)[];

  // Subscribe with `useWatch` rather than `watch()`: `watch()` re-renders the
  // whole flow on every keystroke in every field and is not memoizable.
  // `useWatch` types its result as partial, but these fields all have
  // defaults, so the object is complete in practice.
  const watched = useWatch({ control });
  const values = watched as OnboardingInput;
  const isLastStep = step === STEP_COUNT - 1;
  const progress = ((step + 1) / STEP_COUNT) * 100;

  const goNext = async () => {
    // Validates only this step's fields, per the per-step schema.
    const valid = await trigger(stepFields, { shouldFocus: true });
    if (valid) setStep((current) => Math.min(current + 1, STEP_COUNT - 1));
  };

  const goBack = () => {
    setStep((current) => Math.max(current - 1, FIRST_STEP));
    setSubmitError(null);
  };

  const onSubmit = handleSubmit(async (answers) => {
    setSubmitError(null);
    setSubmitDetail(null);
    try {
      const backend = getBackend();
      await backend.profiles.save(answers);
      await backend.profiles.completeOnboarding();

      // Build the first plan straight away, so a new user lands on a real week
      // rather than an empty screen. A failure here is not fatal: the answers
      // are saved and the schedule page can generate on demand.
      try {
        const catalog = await backend.exercises.list();
        const draft = generatePlan(catalog, {
          fitnessLevel: answers.fitnessLevel,
          primaryGoal: answers.primaryGoal,
          preferredIntensity: answers.preferredIntensity,
          preferredDuration: answers.preferredDuration,
          workoutDaysPerWeek: answers.workoutDaysPerWeek,
          movementsToAvoid: answers.movementsToAvoid,
        });
        await backend.plans.save(draft);
      } catch {
        // Left for the schedule page's "Build my plan" action.
      }

      await refresh();
      router.replace('/schedule');
    } catch (error) {
      if (error instanceof StorageError) {
        setSubmitError(error.message);
        setSubmitDetail(error.code);
      } else {
        setSubmitError('Could not save your answers. Please try again.');
        setSubmitDetail(error instanceof Error ? error.message : String(error));
      }
    }
  });

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-eyebrow">Step {step + 1} of {STEP_COUNT}</p>
      <div
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={STEP_COUNT}
        aria-label="Onboarding progress"
        className="mt-2.5 h-1 overflow-hidden rounded-full bg-card"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <h1 className="mt-6 text-2xl sm:text-3xl">{STEP_TITLES[step]}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{STEP_SUBTITLES[step]}</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-6">
        {step === 0 ? (
          <div className="space-y-5">
            <Input
              label="Name"
              autoComplete="name"
              placeholder="What should we call you?"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <ChoiceGroup
              name="ageRange"
              legend="Age range"
              options={ageRangeOptions}
              value={values.ageRange}
              onChange={(value) =>
                setValue('ageRange', value as OnboardingInput['ageRange'], { shouldValidate: true })
              }
            />
            <ChoiceGroup
              name="gender"
              legend="Gender (optional)"
              options={genderOptions}
              value={values.gender ?? ''}
              onChange={(value) =>
                setValue('gender', value as OnboardingInput['gender'], { shouldValidate: true })
              }
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <ChoiceGroup
              name="fitnessLevel"
              legend="Training experience"
              options={fitnessLevelOptions}
              value={values.fitnessLevel}
              onChange={(value) =>
                setValue('fitnessLevel', value as OnboardingInput['fitnessLevel'], {
                  shouldValidate: true,
                })
              }
            />
            <ChoiceGroup
              name="primaryGoal"
              legend="Main goal"
              options={goalOptions}
              value={values.primaryGoal}
              onChange={(value) =>
                setValue('primaryGoal', value as OnboardingInput['primaryGoal'], {
                  shouldValidate: true,
                })
              }
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <ChoiceGroup
              name="workoutDaysPerWeek"
              legend="Days you can train"
              options={daysPerWeekOptions}
              value={String(values.workoutDaysPerWeek)}
              onChange={(value) =>
                setValue('workoutDaysPerWeek', Number(value), { shouldValidate: true })
              }
            />
            <ChoiceGroup
              name="preferredDuration"
              legend="How long can you train?"
              options={durationOptions}
              value={String(values.preferredDuration)}
              onChange={(value) =>
                setValue('preferredDuration', Number(value), { shouldValidate: true })
              }
            />
            {errors.workoutDaysPerWeek ? (
              <p role="alert" className="text-xs font-medium text-red-400">
                {errors.workoutDaysPerWeek.message}
              </p>
            ) : null}
            {errors.preferredDuration ? (
              <p role="alert" className="text-xs font-medium text-red-400">
                {errors.preferredDuration.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 3 ? (
          <ChoiceGroup
            name="preferredIntensity"
            legend="Session style"
            options={intensityOptions}
            value={values.preferredIntensity}
            onChange={(value) =>
              setValue('preferredIntensity', value as OnboardingInput['preferredIntensity'], {
                shouldValidate: true,
              })
            }
          />
        ) : null}

        {step === 4 ? (
          <AvoidMovementsField
            value={values.movementsToAvoid ?? []}
            onChange={(next) => setValue('movementsToAvoid', next, { shouldValidate: true })}
          />
        ) : null}

        {submitError ? (
          <ErrorState
            compact
            title="Could not save"
            message={submitError}
            {...(submitDetail ? { detail: submitDetail } : {})}
          />
        ) : null}

        <div className="flex items-center gap-3 border-t border-line pt-6">
          {step > FIRST_STEP ? (
            <Button type="button" variant="secondary" onClick={goBack} disabled={isSubmitting}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
          ) : null}

          {isLastStep ? (
            <Button type="submit" block={step === FIRST_STEP} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Build my plan'}
              {!isSubmitting ? <Check className="size-4" aria-hidden="true" /> : null}
            </Button>
          ) : (
            <Button type="button" block={step === FIRST_STEP} onClick={goNext}>
              Continue
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>

      <p className="mt-8 flex items-start gap-2 rounded-md border border-line bg-card/40 p-3.5 text-xs leading-relaxed text-muted">
        <Shield className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
        {SAFETY_LINE}
      </p>
    </div>
  );
};
