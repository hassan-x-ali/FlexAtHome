/**
 * Onboarding step definitions.
 *
 * Each step declares the fields it owns and the Zod schema that validates just
 * those fields, so a step can be validated on its own before the user advances.
 * Kept out of the component so the flow is data, not JSX.
 */
import {
  AGE_RANGES,
  GENDERS,
  type Gender,
  type OnboardingAnswers,
} from '@/lib/domain/types';
import {
  ageRangeLabels,
  fitnessLevelLabels,
  genderLabels,
  intensityLabels,
  onboardingStepSchemas,
  primaryGoalLabels,
} from '@/lib/domain/validation';

/** Number of steps, and the first step index. */
export const STEP_COUNT = 5;
export const FIRST_STEP = 0;

export type Option<T extends string> = { value: T; label: string; detail?: string };

export const fitnessLevelOptions: Option<keyof typeof fitnessLevelLabels>[] = [
  { value: 'beginner', label: 'Beginner', detail: 'New to regular training, or returning after a long break' },
  { value: 'intermediate', label: 'Intermediate', detail: 'Training consistently for a few months' },
  { value: 'advanced', label: 'Advanced', detail: 'Training regularly for a year or more' },
];

export const goalOptions: Option<keyof typeof primaryGoalLabels>[] = [
  { value: 'general_fitness', label: 'General fitness', detail: 'Stay capable and healthy overall' },
  { value: 'strength', label: 'Strength', detail: 'Get stronger at the basics' },
  { value: 'muscle', label: 'Muscle', detail: 'Build visible size' },
  { value: 'endurance', label: 'Endurance', detail: 'Last longer without tiring' },
  { value: 'weight_loss', label: 'Weight loss', detail: 'Burn more, sustainably' },
  { value: 'mobility', label: 'Mobility', detail: 'Move better, undo stiffness' },
  { value: 'consistency', label: 'Consistency', detail: 'Build a habit that sticks' },
];

export const intensityOptions: Option<keyof typeof intensityLabels>[] = [
  { value: 'cardio_heavy', label: 'Cardio-heavy', detail: 'More movement that raises your heart rate' },
  { value: 'strength_focused', label: 'Strength-focused', detail: 'More holds, reps, and slower work' },
  { value: 'balanced', label: 'Balanced', detail: 'A mix of the two' },
];

export const ageRangeOptions: Option<(typeof AGE_RANGES)[number]>[] = AGE_RANGES.map((value) => ({
  value,
  label: ageRangeLabels[value] ?? value,
}));

/** Includes an explicit "prefer not to say", so the choice is never implicit. */
export const genderOptions: Option<Gender>[] = GENDERS.map((value) => ({
  value,
  label: genderLabels[value] ?? value,
}));

/** Days available, offered as a choice rather than a free number. */
export const daysPerWeekOptions: Option<string>[] = [
  { value: '2', label: '2 days', detail: 'A couple of sessions a week' },
  { value: '3', label: '3 days', detail: 'The most common choice' },
  { value: '4', label: '4 days', detail: 'Training most weekdays' },
  { value: '5', label: '5 days', detail: 'Nearly every day' },
];

/** Durations, capped at 90 minutes by the domain rule. */
export const durationOptions: Option<string>[] = [
  { value: '10', label: '10 minutes', detail: 'Short and sharp' },
  { value: '20', label: '20 minutes', detail: 'The sweet spot' },
  { value: '30', label: '30 minutes', detail: 'Room for a proper warm-up' },
  { value: '45', label: '45 minutes', detail: 'A full session' },
];

/** Common movements people ask to avoid. Free text is also accepted. */
export const MOVEMENT_SUGGESTIONS: readonly string[] = [
  'jumping',
  'kneeling',
  'burpees',
  'handstands',
  'neck loading',
  'deep squatting',
  'twisting',
];

export const STEP_TITLES: readonly string[] = [
  'About you',
  'Your training',
  'Your week',
  'Session style',
  'Anything to avoid?',
];

export const STEP_SUBTITLES: readonly string[] = [
  'Just a name and an age range. Nothing here is stored anywhere but your device.',
  'We use this to pick movement difficulty and to favour exercises for your goal.',
  'Honest numbers work better than optimistic ones. You can change all of this later.',
  'This decides the mix of each session.',
  'We will keep these movements out of your plan. Leave it empty if nothing applies.',
];

export const SAFETY_LINE =
  'Stop any exercise that causes pain, and consult a qualified professional if you have an injury or a medical condition.';

/** Empty form state matching `OnboardingAnswers`. */
export const emptyAnswers = (): OnboardingAnswers => ({
  fullName: '',
  ageRange: '25_34',
  gender: null,
  fitnessLevel: 'beginner',
  primaryGoal: 'general_fitness',
  workoutDaysPerWeek: 3,
  preferredDuration: 20,
  preferredIntensity: 'balanced',
  movementsToAvoid: [],
});

/** Validation schema for a step, keyed by index. */
export const schemaForStep = onboardingStepSchemas;
