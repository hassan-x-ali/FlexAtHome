/**
 * Human-readable labels for the catalog's enum values.
 *
 * The stored values are stable machine identifiers; these are the display
 * strings. Kept in one module so a term is worded identically everywhere.
 */
import type { BodyPart, ExerciseType, FitnessLevel, MuscleGroup } from '@/lib/domain/types';
import { SEED_EXERCISES } from '@/lib/domain/exercise-seed';
import { DURATION_BUCKETS, durationBucketOf, type DurationBucket } from '@/lib/storage/types';

import { humanise } from './format';

const bodyPartLabels: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  glutes: 'Glutes',
  legs: 'Legs',
  full_body: 'Full body',
};

const muscleLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  lats: 'Lats',
  traps: 'Traps',
  rhomboids: 'Rhomboids',
  deltoids: 'Deltoids',
  rear_deltoids: 'Rear deltoids',
  rotator_cuff: 'Rotator cuff',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  erector_spine: 'Spinal erectors',
  thoracic_spine: 'Thoracic spine',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  hip_flexors: 'Hip flexors',
  adductors: 'Adductors',
  full_body: 'Full body',
};

const exerciseTypeLabels: Record<ExerciseType, string> = {
  push_up: 'Push',
  bodyweight_squat: 'Squat',
  lunge: 'Lunge',
  plank: 'Plank',
  bridge: 'Bridge',
  crunch: 'Core',
  burpee: 'Conditioning',
  mountain_climber: 'Conditioning',
  jump: 'Plyometric',
  balance: 'Balance',
  stretch: 'Mobility',
  breathing: 'Breathing',
  locomotion: 'Conditioning',
  other: 'Strength',
};

export const bodyPartLabel = (value: BodyPart): string => bodyPartLabels[value] ?? humanise(value);
export const muscleLabel = (value: MuscleGroup): string => muscleLabels[value] ?? humanise(value);
export const exerciseTypeLabel = (value: ExerciseType): string =>
  exerciseTypeLabels[value] ?? humanise(value);

const difficultyOrder: readonly FitnessLevel[] = ['beginner', 'intermediate', 'advanced'];

export const difficultyRank = (level: FitnessLevel): number => {
  const index = difficultyOrder.indexOf(level);
  return index === -1 ? difficultyOrder.length : index;
};

export const DIFFICULTY_ORDER = difficultyOrder;

/** Ordered for filter UI. */
export const BODY_PARTS_FOR_FILTER: readonly BodyPart[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'core',
  'glutes',
  'legs',
  'full_body',
];

export const MUSCLES_FOR_FILTER: readonly MuscleGroup[] = [
  'chest',
  'lats',
  'deltoids',
  'biceps',
  'triceps',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
  'erector_spine',
];

export const EXERCISE_TYPES_FOR_FILTER: readonly ExerciseType[] = [
  'push_up',
  'bodyweight_squat',
  'lunge',
  'plank',
  'bridge',
  'crunch',
  'burpee',
  'mountain_climber',
  'jump',
  'locomotion',
  'balance',
  'stretch',
  'other',
];

const durationBucketLabels: Record<DurationBucket, string> = {
  quick: 'Quick (20s or less)',
  standard: 'Standard (21-45s)',
  long: 'Long (45s or more)',
};

export const durationBucketLabel = (value: DurationBucket): string => durationBucketLabels[value];

/**
 * Only buckets that at least one catalog entry actually fills. Derived from the
 * seed so the filter cannot offer a result the library cannot produce.
 */
export const DURATION_BUCKETS_WITH_RESULTS: readonly DurationBucket[] =
  DURATION_BUCKETS.filter((bucket) =>
    SEED_EXERCISES.some((e) => durationBucketOf(e) === bucket),
  );
