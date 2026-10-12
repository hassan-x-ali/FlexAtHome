/**
 * Zod validation. Every input in the app is validated here, once, and the
 * inferred types are used by forms, the storage adapter, and UI props so the
 * rules cannot drift between layers.
 */
import { z } from 'zod';

import type {
  AgeRange,
  FitnessLevel,
  Gender,
  PreferredIntensity,
  PrimaryGoal,
} from '@/lib/domain/types';
import {
  AGE_RANGES,
  DAY_NAMES,
  FITNESS_LEVELS,
  GENDERS,
  INTENSITIES,
  MAX_DAYS_PER_WEEK,
  MAX_WORKOUT_DURATION,
  MIN_DAYS_PER_WEEK,
  MIN_WORKOUT_DURATION,
  PRIMARY_GOALS,
} from '@/lib/domain/types';

// --- Primitives -------------------------------------------------------------

const trimmed = z.string().trim();

export const fullNameSchema = trimmed
  .min(1, 'Enter your name')
  .max(60, 'Keep this under 60 characters');

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email')
  .max(254, 'That email is too long')
  .pipe(z.email('Enter a valid email address'));

/** Minimum viable password: length plus a little character variety. */
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Keep this under 72 characters')
  .refine((v) => /[a-zA-Z]/.test(v), 'Include at least one letter')
  .refine((v) => /[0-9]/.test(v) || /[^a-zA-Z0-9]/.test(v), {
    message: 'Include a number or symbol',
  });

export const ageRangeSchema = z.enum(AGE_RANGES);
export const genderSchema = z.enum(GENDERS);
export const fitnessLevelSchema = z.enum(FITNESS_LEVELS);
export const primaryGoalSchema = z.enum(PRIMARY_GOALS);
export const intensitySchema = z.enum(INTENSITIES);

/** 1–7 days. */
export const daysPerWeekSchema = z
  .number({ error: 'Pick how many days you can train' })
  .int()
  .min(MIN_DAYS_PER_WEEK, 'At least 1 day per week')
  .max(MAX_DAYS_PER_WEEK, 'At most 7 days per week');

/** Minutes per session, 5–90. */
export const workoutDurationSchema = z
  .number({ error: 'Pick a duration' })
  .int()
  .min(MIN_WORKOUT_DURATION, 'Minimum is 5 minutes')
  .max(MAX_WORKOUT_DURATION, 'Maximum is 90 minutes');

/** Reject negative, zero, and implausible counts. */
export const positiveCountSchema = z
  .number({ error: 'Enter a number' })
  .int('Use whole numbers')
  .min(1, 'Must be at least 1')
  .max(999, 'That is unreasonably high');

export const nonNegativeCountSchema = z
  .number({ error: 'Enter a number' })
  .int('Use whole numbers')
  .min(0, 'Cannot be negative')
  .max(999, 'That is unreasonably high');

/** Seconds, 0–3600 (1 hour). */
export const durationSecondsSchema = z
  .number({ error: 'Enter a duration' })
  .int('Use whole seconds')
  .min(0, 'Cannot be negative')
  .max(3600, 'Maximum is 3600 seconds (1 hour)');

/** Rest between sets, 0–600s. */
export const restSecondsSchema = z
  .number({ error: 'Enter a rest time' })
  .int('Use whole seconds')
  .min(0, 'Cannot be negative')
  .max(600, 'Maximum is 600 seconds (10 minutes)');

export const movementToAvoidSchema = trimmed
  .min(1, 'Enter a movement')
  .max(40, 'Keep this under 40 characters');

// --- Onboarding -------------------------------------------------------------

export const onboardingStepSchemas = {
  0: z.object({ fullName: fullNameSchema, ageRange: ageRangeSchema }),
  1: z.object({
    gender: genderSchema.nullable(),
    fitnessLevel: fitnessLevelSchema,
    primaryGoal: primaryGoalSchema,
  }),
  2: z.object({
    workoutDaysPerWeek: daysPerWeekSchema,
    preferredDuration: workoutDurationSchema,
  }),
  3: z.object({ preferredIntensity: intensitySchema }),
  4: z.object({ movementsToAvoid: z.array(movementToAvoidSchema).max(12) }),
} as const;

export type OnboardingStepValues = z.infer<
  (typeof onboardingStepSchemas)[keyof typeof onboardingStepSchemas]
>;

/** Full answer set — the shape written to the profile row. */
export const onboardingSchema = z.object({
  fullName: fullNameSchema,
  ageRange: ageRangeSchema,
  gender: genderSchema.nullable(),
  fitnessLevel: fitnessLevelSchema,
  primaryGoal: primaryGoalSchema,
  workoutDaysPerWeek: daysPerWeekSchema,
  preferredDuration: workoutDurationSchema,
  preferredIntensity: intensitySchema,
  movementsToAvoid: z.array(movementToAvoidSchema).max(12),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const authCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const emailSignupSchema = z.object({ email: emailSchema });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

// --- Storage write payloads -------------------------------------------------

export const planDraftExerciseSchema = z.object({
  id: z.string().optional(),
  exerciseId: z.string().min(1),
  orderIndex: nonNegativeCountSchema,
  sets: positiveCountSchema.nullable().default(null),
  reps: positiveCountSchema.nullable().default(null),
  durationSeconds: durationSecondsSchema.nullable().default(null),
  restSeconds: restSecondsSchema.default(60),
  notes: z.string().max(500).default(''),
});

export const planDraftDaySchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  name: trimmed.min(1).max(60),
  isRestDay: z.boolean(),
  exercises: z.array(planDraftExerciseSchema).max(30),
});

export const planDraftSchema = z
  .object({
    id: z.string().optional(),
    name: trimmed.min(1, 'Give the plan a name').max(80),
    description: z.string().max(500).default(''),
    days: z.array(planDraftDaySchema).min(1, 'Add at least one day').max(7),
  })
  .refine((v) => v.days.length <= 7, 'A week has at most 7 days')
  .refine(
    (v) => v.days.every((d) => d.isRestDay || d.exercises.length > 0),
    { message: 'Every training day needs at least one exercise' },
  )
  .refine(
    (v) => new Set(v.days.map((d) => d.dayOfWeek)).size === v.days.length,
    { message: 'Each day of the week can only appear once' },
  );

export type PlanDraft = z.infer<typeof planDraftSchema>;

/**
 * What callers pass to `plans.save()`: the same shape, but every defaultable
 * field optional so a caller need not restate them. Validation still runs
 * inside the adapter, so nothing unvalidated is ever persisted.
 */
export type PlanDraftInput = z.input<typeof planDraftSchema>;

export const workoutLogStartSchema = z.object({
  workoutPlanId: z.string().nullable(),
  workoutDayId: z.string().nullable(),
  startedAt: z.iso.datetime(),
});

export const workoutLogCompleteSchema = z.object({
  completedAt: z.iso.datetime(),
  durationSeconds: durationSecondsSchema,
  notes: z.string().max(1000).default(''),
});

export const exerciseLogInputSchema = z.object({
  exerciseId: z.string().min(1),
  setsCompleted: nonNegativeCountSchema,
  repsCompleted: nonNegativeCountSchema,
  durationSeconds: durationSecondsSchema,
  notes: z.string().max(500).default(''),
});

export const profileUpdateSchema = z.object({
  fullName: fullNameSchema.optional(),
  ageRange: ageRangeSchema.optional(),
  gender: genderSchema.nullable().optional(),
  fitnessLevel: fitnessLevelSchema.optional(),
  primaryGoal: primaryGoalSchema.optional(),
  workoutDaysPerWeek: daysPerWeekSchema.optional(),
  preferredDuration: workoutDurationSchema.optional(),
  preferredIntensity: intensitySchema.optional(),
  movementsToAvoid: z.array(movementToAvoidSchema).max(12).optional(),
});

// --- Display helpers --------------------------------------------------------

export const ageRangeLabels: Record<AgeRange, string> = {
  under_18: 'Under 18',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_54': '45–54',
  '55_plus': '55+',
};

export const genderLabels: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not_to_say: 'Prefer not to say',
};

export const fitnessLevelLabels: Record<FitnessLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const primaryGoalLabels: Record<PrimaryGoal, string> = {
  general_fitness: 'General fitness',
  strength: 'Strength',
  muscle: 'Muscle',
  endurance: 'Endurance',
  weight_loss: 'Weight loss',
  mobility: 'Mobility',
  consistency: 'Consistency',
};

export const intensityLabels: Record<PreferredIntensity, string> = {
  cardio_heavy: 'Cardio-heavy',
  strength_focused: 'Strength-focused',
  balanced: 'Balanced',
};

export const dayName = (index: number): string => DAY_NAMES[index] ?? `Day ${index}`;
