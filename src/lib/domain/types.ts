/**
 * Domain types.
 *
 * This module is the single source of truth for the shape of every persisted
 * entity. It depends on nothing — no React, no browser globals, no Supabase.
 * Everything else (validation, storage, UI) derives from these shapes.
 */

// --- Shared scalar unions ---------------------------------------------------

export const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

export const PRIMARY_GOALS = [
  'general_fitness',
  'strength',
  'muscle',
  'endurance',
  'weight_loss',
  'mobility',
  'consistency',
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const INTENSITIES = ['cardio_heavy', 'strength_focused', 'balanced'] as const;
export type PreferredIntensity = (typeof INTENSITIES)[number];

export const AGE_RANGES = [
  'under_18',
  '18_24',
  '25_34',
  '35_44',
  '45_54',
  '55_plus',
] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say'] as const;
export type Gender = (typeof GENDERS)[number];

export const BODY_PARTS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'core',
  'glutes',
  'legs',
  'full_body',
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export const MUSCLE_GROUPS = [
  'chest',
  'lats',
  'traps',
  'rhomboids',
  'deltoids',
  'rear_deltoids',
  'rotator_cuff',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'erector_spine',
  'thoracic_spine',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'hip_flexors',
  'adductors',
  'full_body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EXERCISE_TYPES = [
  'push_up',
  'bodyweight_squat',
  'lunge',
  'plank',
  'bridge',
  'crunch',
  'burpee',
  'mountain_climber',
  'jump',
  'balance',
  'stretch',
  'breathing',
  'locomotion',
  'other',
] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EQUIPMENT_VALUES = ['none'] as const;
export type Equipment = (typeof EQUIPMENT_VALUES)[number];

/**
 * A slug reference to another catalog entry. Relations are stored as slugs
 * rather than ids because slugs are stable across a local seed and a cloud
 * row, which keeps the local and Supabase payloads identical.
 */
export type ExerciseSlug = string;

/** 0 = Sunday, 6 = Saturday. Matches `Date.prototype.getDay()`. */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Minutes. Bounds are enforced by Zod and mirrored in the DB as a check. */
export const MIN_WORKOUT_DURATION = 5;
export const MAX_WORKOUT_DURATION = 90;
export const MIN_DAYS_PER_WEEK = 1;
export const MAX_DAYS_PER_WEEK = 7;

// --- Entities ---------------------------------------------------------------

/**
 * Mirrors `profiles`. In cloud mode `id` is the Supabase auth uid; in local
 * mode it is a synthetic `local_` id.
 */
export type Profile = {
  id: string;
  fullName: string;
  ageRange: AgeRange;
  gender: Gender | null;
  fitnessLevel: FitnessLevel;
  primaryGoal: PrimaryGoal;
  workoutDaysPerWeek: number;
  preferredDuration: number;
  preferredIntensity: PreferredIntensity;
  /** Movements the user asked to avoid, e.g. ['jump', 'kneeling']. */
  movementsToAvoid: string[];
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Mirrors `exercises` — shared reference data, not user-owned. */
export type Exercise = {
  id: string;
  name: string;
  slug: string;
  description: string;
  bodyParts: BodyPart[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  difficulty: FitnessLevel;
  exerciseType: ExerciseType;
  equipmentRequired: Equipment;
  instructions: string[];
  formCues: string[];
  commonMistakes: string[];
  breathingInstruction: string;
  recommendedSets: number | null;
  recommendedReps: number | null;
  recommendedDurationSeconds: number | null;
  recommendedRestSeconds: number;
  safetyNotes: string;
  /**
   * Related exercise slugs, resolved through the same catalog so the detail
   * page can cross-link bidirectionally. Upward = harder, downward = easier.
   */
  progressionExercises: ExerciseSlug[];
  regressionExercises: ExerciseSlug[];
  alternativeExercises: ExerciseSlug[];
  createdAt: string;
};

/** Mirrors `workout_plans`. */
export type WorkoutPlan = {
  id: string;
  userId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Mirrors `workout_days`. */
export type WorkoutDay = {
  id: string;
  workoutPlanId: string;
  dayOfWeek: DayIndex;
  name: string;
  isRestDay: boolean;
  createdAt: string;
};

/** Mirrors `workout_exercises`. */
export type WorkoutExercise = {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  orderIndex: number;
  sets: number | null;
  reps: number | null;
  durationSeconds: number | null;
  restSeconds: number;
  notes: string;
  createdAt: string;
};

/** Mirrors `workout_logs`. */
export type WorkoutLog = {
  id: string;
  userId: string;
  workoutPlanId: string | null;
  workoutDayId: string | null;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number;
  notes: string;
  createdAt: string;
};

/** Mirrors `exercise_logs`. */
export type ExerciseLog = {
  id: string;
  workoutLogId: string;
  exerciseId: string;
  setsCompleted: number;
  repsCompleted: number;
  durationSeconds: number;
  notes: string;
  createdAt: string;
};

// --- Joined read models ------------------------------------------------------

/** A workout day with its exercises resolved and ordered. */
export type WorkoutDayWithExercises = WorkoutDay & {
  exercises: (WorkoutExercise & { exercise: Exercise })[];
};

/** A plan with all its days and their exercises resolved. */
export type WorkoutPlanWithDays = WorkoutPlan & {
  days: WorkoutDayWithExercises[];
};

/** A workout log with its per-exercise entries resolved. */
export type WorkoutLogWithExercises = WorkoutLog & {
  exercises: (ExerciseLog & { exercise: Exercise })[];
};

// --- Onboarding draft -------------------------------------------------------

/**
 * Onboarding is staged: answers are validated per-step before being written, so
 * this is the un-persisted shape the form works with. `ageRange` and `gender`
 * are additions beyond the base `profiles` columns and are stored on the
 * profile row — see docs/SCHEMA-NOTES.md.
 */
export type OnboardingAnswers = {
  fullName: string;
  ageRange: AgeRange;
  gender: Gender | null;
  fitnessLevel: FitnessLevel;
  primaryGoal: PrimaryGoal;
  workoutDaysPerWeek: number;
  preferredDuration: number;
  preferredIntensity: PreferredIntensity;
  movementsToAvoid: string[];
};
