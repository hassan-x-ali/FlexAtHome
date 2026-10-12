/**
 * Plan generation rules.
 *
 * This module is pure: profile in, plan draft out. It touches no storage and no
 * React, so it can be exercised directly by the contract suite.
 *
 * Two rules drive everything:
 *
 *  - Recommendation responds to BOTH level and goal. Level sets the ceiling on
 *    difficulty; goal shifts the exercise mix. Neither alone decides a plan.
 *  - Time is a budget, not a target. The generator fills the session up to the
 *    user's stated duration and stops, rather than overfilling and hoping.
 */
import type {
  BodyPart,
  Exercise,
  FitnessLevel,
  MuscleGroup,
  PreferredIntensity,
  PrimaryGoal,
  WorkoutDayWithExercises,
  WorkoutExercise,
} from '@/lib/domain/types';
import type { PlanDraftInput } from '@/lib/domain/validation';
import { newId, nowIso } from '@/lib/domain/ids';

/** What the generator needs to know about the user. */
export type GeneratorInput = {
  fitnessLevel: FitnessLevel;
  primaryGoal: PrimaryGoal;
  preferredIntensity: PreferredIntensity;
  preferredDuration: number;
  workoutDaysPerWeek: number;
  /** Free-text movements from onboarding, e.g. ['jumping', 'kneeling']. */
  movementsToAvoid: string[];
  /**
   * Id of the plan being replaced. When omitted a new plan is created; when
   * passed, the result reuses it so rebuilding overwrites in place instead of
   * accumulating one plan per rebuild.
   */
  replacePlanId?: string;
};

const LEVEL_RANK: Record<FitnessLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Ceiling on difficulty per level. A beginner is never given an advanced
 * movement, even when the goal is muscle.
 */
const DIFFICULTY_CEILING: Record<FitnessLevel, FitnessLevel> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
};

/**
 * How many difficulty levels below the ceiling an exercise may sit. Allows a
 * beginner plan to use a regression of an intermediate pattern, which is how
 * progressions are usually taught.
 */
const DIFFICULTY_SLACK: Record<FitnessLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 2,
};

/**
 * Body parts each goal prioritises, in order. A goal is expressed as a body-part
 * emphasis rather than a movement whitelist, so it composes with the exercise
 * catalog instead of duplicating it.
 */
const GOAL_BODY_EMPHASIS: Record<PrimaryGoal, readonly BodyPart[]> = {
  general_fitness: ['full_body', 'legs', 'chest', 'back', 'core'],
  strength: ['legs', 'chest', 'back', 'shoulders', 'core'],
  muscle: ['chest', 'back', 'legs', 'shoulders', 'arms'],
  endurance: ['full_body', 'legs', 'core'],
  weight_loss: ['full_body', 'legs', 'core'],
  mobility: ['back', 'legs', 'full_body', 'core'],
  consistency: ['full_body', 'legs', 'core', 'chest'],
};

/**
 * Muscles each goal prioritises. Used to break ties inside a body part so a
 * strength plan does not end up push-only.
 */
const GOAL_MUSCLE_EMPHASIS: Record<PrimaryGoal, readonly MuscleGroup[]> = {
  general_fitness: ['quads', 'chest', 'lats', 'abs', 'glutes', 'deltoids'],
  strength: ['quads', 'glutes', 'chest', 'lats', 'deltoids', 'abs'],
  muscle: ['chest', 'lats', 'quads', 'deltoids', 'triceps', 'biceps'],
  endurance: ['quads', 'full_body', 'abs', 'calves'],
  weight_loss: ['full_body', 'quads', 'calves', 'abs', 'glutes'],
  mobility: ['erector_spine', 'thoracic_spine', 'hip_flexors', 'glutes', 'quads'],
  consistency: ['quads', 'abs', 'chest', 'glutes', 'deltoids'],
};

/**
 * How strongly a session type is favoured per goal. A mobility plan is mostly
 * stretching; a muscle plan is mostly strength work. Values are relative
 * weights, not counts.
 */
const GOAL_TYPE_WEIGHTS: Record<PrimaryGoal, Partial<Record<Exercise['exerciseType'], number>>> = {
  general_fitness: { bodyweight_squat: 3, push_up: 3, plank: 2, other: 2, mountain_climber: 2, stretch: 1 },
  strength: { bodyweight_squat: 4, push_up: 3, lunge: 3, other: 3, plank: 2, stretch: 1 },
  muscle: { push_up: 4, other: 3, bodyweight_squat: 3, lunge: 2, plank: 1, stretch: 1 },
  endurance: { mountain_climber: 5, burpee: 5, locomotion: 5, jump: 4, other: 1, plank: 1, stretch: 1 },
  weight_loss: { burpee: 5, mountain_climber: 5, locomotion: 4, jump: 4, bodyweight_squat: 2, stretch: 1 },
  mobility: { stretch: 5, other: 1, plank: 1 },
  // Stretching is mobility work. It appears in other plans as a warm-up or a
  // cooldown, so it is weighted low rather than excluded: a training week with
  // no mobility in it is a training week that will feel stiff.
  consistency: { plank: 2, bodyweight_squat: 2, push_up: 2, other: 2, stretch: 1 },
};

/**
 * Intensity shifts the balance between conditioning and strength work. This is a
 * multiplier on the goal's own type weights, never a replacement for them.
 */
const INTENSITY_TYPE_BIAS: Record<PreferredIntensity, Partial<Record<Exercise['exerciseType'], number>>> = {
  cardio_heavy: { mountain_climber: 3, burpee: 3, locomotion: 3, jump: 2, plank: 1 },
  strength_focused: { bodyweight_squat: 3, push_up: 3, lunge: 2, other: 2 },
  balanced: {},
};

/** Rest between sets, in seconds, before time is added to the estimate. */
const REST_SECONDS: Record<FitnessLevel, number> = {
  beginner: 90,
  intermediate: 75,
  advanced: 60,
};

/**
 * A movement tag is matched if the exercise's name, its exercise type, or any of
 * its instructions/form cues mention the avoided term. Onboarding collects free
 * text, so this is deliberately fuzzy in the user's favour: a false positive
 * removes one exercise, a false negative trains someone in something they asked
 * to avoid.
 */
const matchesAvoidedMovement = (exercise: Exercise, avoided: string): boolean => {
  const needle = avoided.trim().toLowerCase();
  if (needle.length < 3) return false;

  const haystack = [
    exercise.name,
    exercise.exerciseType.replace(/_/g, ' '),
    ...exercise.bodyParts,
    ...exercise.instructions,
    ...exercise.formCues,
  ]
    .join(' ')
    .toLowerCase();

  // Word-boundary match, so "jumping" does not match "jumper".
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const direct = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(haystack);
  if (direct) return true;

  // A user who avoids "jumping" means no jumping. Catalog prose uses the
  // base form ("jump"), so also match a regular inflection. A false positive
  // removes one exercise; a false negative trains someone in what they asked
  // to avoid, so err toward excluding.
  if (/(jump|jumping|leap|leaping|bound|bouncing)$/.test(needle)) {
    // Match the stem with any suffix: "jump", "jumping", "jumps".
    const stem = escaped.replace(/(ing|ing|leap|bound|bounc)$/, '');
    return new RegExp(`(^|[^a-z])${stem}[a-z]*([^a-z]|$)`).test(haystack);
  }

  return false;
};

/** True when the exercise is safe to program given the user's avoid list. */
export const isAvoidable = (exercise: Exercise, avoidList: readonly string[]): boolean =>
  !avoidList.some((term) => matchesAvoidedMovement(exercise, term));

/** Difficulty is within the user's ceiling, allowing the configured slack. */
const withinDifficultyCeiling = (exercise: Exercise, level: FitnessLevel): boolean =>
  LEVEL_RANK[exercise.difficulty] <= LEVEL_RANK[DIFFICULTY_CEILING[level]] + DIFFICULTY_SLACK[level];

/** Estimated seconds for one prescribed set, rest included. */
const estimateSetSeconds = (exercise: Exercise): number => {
  const sets = exercise.recommendedSets ?? 3;
  const rest = exercise.recommendedRestSeconds;

  if (exercise.recommendedDurationSeconds) {
    // Isometric: the hold plus rest, per set.
    return exercise.recommendedDurationSeconds + rest;
  }

  const reps = exercise.recommendedReps ?? 10;
  // Roughly three seconds per rep, which is a deliberate, self-paced tempo
  // rather than a target.
  const workPerSet = reps * 3;
  return sets * (workPerSet + rest);
};

/**
 * A score for how well an exercise serves the user's goal, used to order
 * candidates. Higher is better. Deterministic, so the same profile always
 * produces the same plan.
 */
const scoreForGoal = (exercise: Exercise, goal: PrimaryGoal): number => {
  const bodyIndex = GOAL_BODY_EMPHASIS[goal].indexOf(exercise.bodyParts[0] ?? 'full_body');
  const bodyScore = bodyIndex === -1 ? 0 : GOAL_BODY_EMPHASIS[goal].length - bodyIndex;

  const muscleIndex = GOAL_MUSCLE_EMPHASIS[goal].findIndex((muscle) =>
    exercise.primaryMuscles.includes(muscle),
  );
  const muscleScore = muscleIndex === -1 ? 0 : GOAL_MUSCLE_EMPHASIS[goal].length - muscleIndex;

  const typeWeight = GOAL_TYPE_WEIGHTS[goal][exercise.exerciseType] ?? 1;

  return bodyScore * 3 + muscleScore * 2 + typeWeight * 4;
};

/** Applies the user's session-style bias on top of the goal score. */
const applyIntensityBias = (exercise: Exercise, intensity: PreferredIntensity): number => {
  const bias = INTENSITY_TYPE_BIAS[intensity][exercise.exerciseType];
  return bias ?? 1;
};

/**
 * Picks the exercises for one session.
 *
 * Deliberately not random and not a simple top-N: sessions alternate emphasis
 * so a week does not repeat the same pattern, and each exercise is chosen for a
 * distinct body part where possible.
 */
export const selectExercisesForDay = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  /** Rotates the emphasis so consecutive days do not look identical. */
  dayIndex: number,
  /** How many exercises the time budget allows. */
  target: number,
  /**
   * Exercise ids already programmed earlier in the week. These are demoted
   * rather than banned, so a thin catalog still produces full sessions.
   */
  weekUsed: ReadonlySet<string> = new Set(),
  /** The day's remit. Defaults to a full-body session. */
  split: SessionSplit = 'full',
): Exercise[] => {
  const goal = input.primaryGoal;
  const splitParts = SPLIT_BODY_PARTS[split];

  const eligible = catalog.filter(
    (exercise) =>
      withinDifficultyCeiling(exercise, input.fitnessLevel) &&
      isAvoidable(exercise, input.movementsToAvoid),
  );

  // The order of SPLIT_BODY_PARTS is the day's priority, so the movement a
  // session leads with matches the day's name. Without this the goal's own
  // emphasis leaks in and a "legs and glutes" day can open with a plank.
  const dayEmphasis = splitParts ?? GOAL_BODY_EMPHASIS[goal];

  // A split's remit is preferred, not absolute. Preferring keeps a "legs and
  // glutes" session led by legs work, while still filling the session when the
  // catalog happens to have nothing else — a hard filter would leave a day
  // empty, which is worse than a slightly off-topic session.
  const inRemit = eligible.filter(
    (exercise) => splitParts === null || exercise.bodyParts.some((part) => splitParts.includes(part)),
  );
  const allowed = inRemit.length >= 3 ? inRemit : eligible;

  // Rotate the emphasis start by the day so a three-day week does not push on
  // the same pattern three times.
  const rotated = [...dayEmphasis.slice(dayIndex % dayEmphasis.length), ...dayEmphasis];

  const scored = allowed
    .map((exercise) => {
      // The rotated emphasis is the primary signal for which body part leads
      // the session, so a match is boosted above any single goal score.
      const emphasisIndex = rotated.indexOf(exercise.bodyParts[0] ?? 'full_body');
      const emphasisBonus = emphasisIndex === -1 ? 0 : (rotated.length - emphasisIndex) * 10;

      // Already used earlier in the week: heavily demoted, not banned. A
      // repetition is better than an empty session.
      const repeatPenalty = weekUsed.has(exercise.id) ? 0.25 : 1;

      return {
        exercise,
        score:
          (scoreForGoal(exercise, goal) + emphasisBonus) *
          applyIntensityBias(exercise, input.preferredIntensity) *
          repeatPenalty,
      };
    })
    .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));

  const chosen: Exercise[] = [];
  const usedBodyParts = new Set<string>();
  const usedExercises = new Set<string>();

  // First pass: one exercise per emphasised body part, best score first.
  for (const part of rotated) {
    if (chosen.length >= target) break;
    const match = scored.find(
      ({ exercise }) =>
        !usedExercises.has(exercise.id) &&
        !usedBodyParts.has(part) &&
        exercise.bodyParts.includes(part),
    );
    if (match) {
      chosen.push(match.exercise);
      usedExercises.add(match.exercise.id);
      usedBodyParts.add(part);
    }
  }

  // Second pass: top up with the best remaining exercises, avoiding exact
  // duplicates. A session may still repeat a body part if the catalog is thin.
  if (chosen.length < target) {
    for (const { exercise } of scored) {
      if (chosen.length >= target) break;
      if (usedExercises.has(exercise.id)) continue;
      chosen.push(exercise);
      usedExercises.add(exercise.id);
    }
  }

  return chosen;
};

/**
 * Sessions per week, and the split of focus. Consecutive days alternate push,
  pull, and legs/core emphasis so muscles get a day to recover.
 */
/** The focus of a single session. */
export type SessionSplit = 'full' | 'upper' | 'lower' | 'core';

/**
 * Which body parts each split may draw from.
 *
 * Without this a "legs and glutes" session can end up led by planks and shadow
 * boxing, because the goal score outweighs the day's own remit.
 */
const SPLIT_BODY_PARTS: Record<SessionSplit, readonly BodyPart[] | null> = {
  // A full-body day may use anything.
  full: null,
  // Push-dominant plus trunk.
  upper: ['chest', 'shoulders', 'arms', 'core', 'back'],
  // Legs and hips, with a little core and back work.
  lower: ['legs', 'glutes', 'core', 'back'],
  // Trunk and conditioning.
  core: ['core', 'full_body', 'back', 'legs'],
};

export const WEEK_SPLIT: Record<number, readonly SessionSplit[]> = {
  1: ['full'],
  2: ['full', 'full'],
  3: ['full', 'upper', 'lower'],
  4: ['full', 'upper', 'lower', 'full'],
  5: ['full', 'upper', 'lower', 'full', 'core'],
  6: ['full', 'upper', 'lower', 'full', 'upper', 'lower'],
  7: ['full', 'upper', 'lower', 'full', 'upper', 'lower', 'core'],
};

/** The training days in a week, as `getDay()` indices (0 = Sunday). */
export const trainingDayIndices = (daysPerWeek: number): number[] => {
  // Spread training days across the week with rest between them, then normalise
  // into the 0-6 range. Four days becomes Mon/Tue/Thu/Fri; three becomes
  // Mon/Wed/Fri rather than Mon/Tue/Wed.
  const spacing = Math.max(1, Math.floor(7 / daysPerWeek));
  const days: number[] = [];
  for (let i = 0; i < daysPerWeek; i += 1) {
    days.push((1 + i * spacing) % 7);
  }
  return [...new Set(days)].sort((a, b) => a - b);
};

/** Session titles by split. */
const SPLIT_NAMES: Record<SessionSplit, string> = {
  full: 'Full body',
  upper: 'Push and core',
  lower: 'Legs and glutes',
  core: 'Core and conditioning',
};

/**
 * Converts a selected exercise into a plan row, scaling volume to the user's
 * level. Beginners get fewer sets; advanced users get more, within what the
 * catalog and the time budget allow.
 */
const toPlanExercise = (
  exercise: Exercise,
  input: GeneratorInput,
  orderIndex: number,
) => ({
  exerciseId: exercise.id,
  orderIndex,
  // Set count by level, never below the catalog's recommendation for beginners.
  sets:
    input.fitnessLevel === 'advanced'
      ? (exercise.recommendedSets ?? 3) + 1
      : input.fitnessLevel === 'intermediate'
        ? (exercise.recommendedSets ?? 3)
        : Math.max(2, Math.min(exercise.recommendedSets ?? 3, 3)),
  reps: exercise.recommendedReps ?? null,
  durationSeconds: exercise.recommendedDurationSeconds ?? null,
  restSeconds: Math.min(exercise.recommendedRestSeconds, REST_SECONDS[input.fitnessLevel]),
  notes: '',
});

/**
 * Builds a whole plan from a profile.
 *
 * `preferredDuration` is treated as a per-session budget. Each session is filled
 * until adding another exercise would exceed it, so a 20-minute preference
 * produces roughly 20-minute sessions rather than whatever the catalog's full
 * prescription adds up to.
 */
export const generatePlan = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
): PlanDraftInput => {
  const daysPerWeek = Math.min(Math.max(input.workoutDaysPerWeek, 1), 7);
  const split = WEEK_SPLIT[daysPerWeek] ?? WEEK_SPLIT[3]!;
  const trainingDays = trainingDayIndices(daysPerWeek);

  // Budget in seconds, minus a small allowance for transitions.
  const budgetSeconds = Math.max(300, input.preferredDuration * 60 - 60);

  // Work out how many exercises a session can hold from the median cost of the
  // movements actually available, not from the whole catalog. Averaging over
  // every exercise underestimates the cost of the specific ones a session will
  // use, which is how a 45-minute preference ended up with eleven movements.
  const usable = catalog.filter(
    (exercise) =>
      withinDifficultyCeiling(exercise, input.fitnessLevel) &&
      isAvoidable(exercise, input.movementsToAvoid),
  );
  const perSetCosts = usable
    .map((exercise) => estimateSetSeconds(exercise) / Math.max(1, exercise.recommendedSets ?? 1))
    .sort((a, b) => a - b);
  const medianCost = perSetCosts[Math.floor(perSetCosts.length / 2)] ?? 90;

  // Never more than six. A session with more movements than that stops being a
  // session and becomes a checklist.
  const maxPerSession = Math.max(3, Math.min(6, Math.round(budgetSeconds / (medianCost * 3))));

  // Accumulated across the week so consecutive days favour different movements.
  const weekUsed = new Set<string>();

  const days = trainingDays.map((dayIndex, position) => {
    const focus = split[position % split.length] ?? 'full';

    // Fill up to the budget, not up to maxPerSession, so short sessions stay short.
    const selected: Exercise[] = [];
    let elapsed = 0;
    // Ask for more than the cap so the budget loop has something to choose
    // from, but never select more than the cap itself.
    const candidates = selectExercisesForDay(catalog, input, position, maxPerSession + 4, weekUsed, focus);

    // A mobility plan is not topped up with conditioning work. Stretching is the
    // session, not the garnish, so the top-up is capped here.
    // A mobility session is short by nature; the rest are bounded by the cap.
    const maxForThisDay = input.primaryGoal === 'mobility' ? Math.min(4, maxPerSession) : maxPerSession;

    for (const exercise of candidates) {
      const cost = estimateSetSeconds(exercise);
      // Always take at least three, then stop when the budget is spent.
      if (selected.length >= 3 && elapsed + cost > budgetSeconds) break;
      // Do not exceed this day's cap once the minimum is met.
      if (selected.length >= Math.max(3, maxForThisDay)) break;
      selected.push(exercise);
      elapsed += cost;
      // Later days demote this, so the week does not repeat one session.
      weekUsed.add(exercise.id);
    }

    return {
      dayOfWeek: dayIndex as PlanDraftInput['days'][number]['dayOfWeek'],
      name: SPLIT_NAMES[focus],
      isRestDay: false,
      exercises: selected.map((exercise, order) => toPlanExercise(exercise, input, order)),
    };
  });


  // Fill the remaining days of the week as rest, so the plan covers all seven.
  const restDays = [0, 1, 2, 3, 4, 5, 6]
    .filter((day) => !trainingDays.includes(day))
    .map((dayOfWeek) => ({
      dayOfWeek: dayOfWeek as PlanDraftInput['days'][number]['dayOfWeek'],
      name: 'Rest',
      isRestDay: true,
      exercises: [],
    }));

  const allDays = [...days, ...restDays].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const planName = planNameFor(input);

  return {
    ...(input.replacePlanId ? { id: input.replacePlanId } : {}),
    name: planName,
    description: planDescriptionFor(input, days.length),
    days: allDays,
  };
};

const planNameFor = (input: GeneratorInput): string => {
  const goalWord: Record<PrimaryGoal, string> = {
    general_fitness: 'Everyday Fitness',
    strength: 'Everyday Strength',
    muscle: 'Everyday Muscle',
    endurance: 'Everyday Endurance',
    weight_loss: 'Everyday Conditioning',
    mobility: 'Everyday Mobility',
    consistency: 'Everyday Consistency',
  };
  return `${goalWord[input.primaryGoal]} · ${input.workoutDaysPerWeek} day${input.workoutDaysPerWeek === 1 ? '' : 's'}`;
};

const planDescriptionFor = (input: GeneratorInput, dayCount: number): string => {
  const parts = [
    `${dayCount} day${dayCount === 1 ? '' : 's'} a week`,
    `about ${input.preferredDuration} minutes per session`,
    `${input.fitnessLevel} level`,
  ];
  if (input.movementsToAvoid.length > 0) {
    parts.push(`avoiding ${input.movementsToAvoid.join(', ')}`);
  }
  return `${parts.join(', ')}. Built from your onboarding answers.`;
};

/**
 * Exposed for the generator test suite only. Exists so the difficulty ceiling
 * can be asserted directly rather than inferred from generated plans.
 */
export const withinDifficultyCeilingForTest = (
  exercise: Exercise,
  level: FitnessLevel,
): boolean => withinDifficultyCeiling(exercise, level);

/**
 * Regenerates a single exercise in a day, keeping all other exercises unchanged.
 * Returns a new exercise prescription that fits the same budget and constraints.
 */
export const regenerateExerciseForDay = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  day: WorkoutDayWithExercises,
  excludeExerciseId: string,
): (WorkoutExercise & { exercise: Exercise }) | null => {
  // Map exercise type to session split for body-part filtering
  const exerciseTypeToSplit: Record<string, SessionSplit> = {
    push_up: 'upper',
    bodyweight_squat: 'lower',
    lunge: 'lower',
    plank: 'core',
    bridge: 'core',
    crunch: 'core',
    burpee: 'full',
    mountain_climber: 'full',
    jump: 'full',
    balance: 'core',
    stretch: 'core',
    breathing: 'core',
    locomotion: 'full',
    other: 'full',
  };
  const firstExercise = day.exercises[0];
  const focus: SessionSplit = firstExercise ? exerciseTypeToSplit[firstExercise.exercise.exerciseType] ?? 'full' : 'full';
  const splitParts = SPLIT_BODY_PARTS[focus] ?? GOAL_BODY_EMPHASIS[input.primaryGoal];

  // Budget for this day
  const budgetSeconds = Math.max(300, input.preferredDuration * 60 - 60);

  // Current elapsed time excluding the exercise being replaced
  const currentElapsed = day.exercises
    .filter((e) => e.exerciseId !== excludeExerciseId)
    .reduce((total, item) => {
      const work = item.sets && item.reps ? item.sets * item.reps * 3 : (item.durationSeconds ?? 30) * (item.sets ?? 1);
      return total + work + item.restSeconds;
    }, 0);

  const remainingBudget = budgetSeconds - currentElapsed;
  if (remainingBudget < 60) return null; // Not enough budget

  // Select from eligible exercises, excluding the one being replaced and those already in the day
  const dayUsed = new Set(day.exercises.map((e) => e.exerciseId));
  dayUsed.delete(excludeExerciseId);

  const eligible = catalog.filter(
    (exercise) =>
      withinDifficultyCeiling(exercise, input.fitnessLevel) &&
      isAvoidable(exercise, input.movementsToAvoid) &&
      !dayUsed.has(exercise.id),
  );

  // Prefer exercises that match the day's split
  const inRemit = eligible.filter(
    (exercise) => splitParts === null || exercise.bodyParts.some((part) => splitParts.includes(part)),
  );
  const allowed = inRemit.length >= 3 ? inRemit : eligible;

  // Score candidates
  const scored = allowed
    .map((exercise) => {
      const bodyIndex = splitParts?.indexOf(exercise.bodyParts[0] ?? 'full_body') ?? GOAL_BODY_EMPHASIS[input.primaryGoal].indexOf(exercise.bodyParts[0] ?? 'full_body');
      const bodyScore = bodyIndex === -1 ? 0 : (splitParts?.length ?? GOAL_BODY_EMPHASIS[input.primaryGoal].length) - bodyIndex;

      const muscleIndex = GOAL_MUSCLE_EMPHASIS[input.primaryGoal].findIndex((muscle) =>
        exercise.primaryMuscles.includes(muscle),
      );
      const muscleScore = muscleIndex === -1 ? 0 : GOAL_MUSCLE_EMPHASIS[input.primaryGoal].length - muscleIndex;

      const typeWeight = GOAL_TYPE_WEIGHTS[input.primaryGoal][exercise.exerciseType] ?? 1;
      const intensityBias = applyIntensityBias(exercise, input.preferredIntensity);

      return {
        exercise,
        score: (bodyScore * 3 + muscleScore * 2 + typeWeight * 4) * intensityBias,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Find first that fits budget
  for (const { exercise } of scored) {
    const cost = estimateSetSeconds(exercise);
    if (cost <= remainingBudget) {
      const orderIndex = day.exercises.find((e) => e.exerciseId === excludeExerciseId)?.orderIndex ?? 0;
      const base = toPlanExercise(exercise, input, orderIndex);
      return {
        id: newId(),
        workoutDayId: day.id,
        exerciseId: base.exerciseId,
        orderIndex: base.orderIndex,
        sets: base.sets,
        reps: base.reps,
        durationSeconds: base.durationSeconds,
        restSeconds: base.restSeconds,
        notes: base.notes,
        createdAt: nowIso(),
        exercise,
      };
    }
  }

  return null;
};

/**
 * Replaces an exercise with a specific alternative exercise.
 * Returns the new prescription if the alternative is valid and fits the budget.
 */
export const replaceExerciseInDay = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  day: WorkoutDayWithExercises,
  excludeExerciseId: string,
  alternativeExerciseId: string,
): (WorkoutExercise & { exercise: Exercise }) | null => {
  const alternative = catalog.find((e) => e.id === alternativeExerciseId);
  if (!alternative) return null;

  // Check if alternative is valid for user
  if (!withinDifficultyCeiling(alternative, input.fitnessLevel)) return null;
  if (!isAvoidable(alternative, input.movementsToAvoid)) return null;

  // Check if already in day
  const dayUsed = new Set(day.exercises.map((e) => e.exerciseId));
  dayUsed.delete(excludeExerciseId);
  if (dayUsed.has(alternativeExerciseId)) return null;

  // Check budget
  const budgetSeconds = Math.max(300, input.preferredDuration * 60 - 60);
  const currentElapsed = day.exercises
    .filter((e) => e.exerciseId !== excludeExerciseId)
    .reduce((total, item) => {
      const work = item.sets && item.reps ? item.sets * item.reps * 3 : (item.durationSeconds ?? 30) * (item.sets ?? 1);
      return total + work + item.restSeconds;
    }, 0);

  const altCost = estimateSetSeconds(alternative);
  if (currentElapsed + altCost > budgetSeconds) return null;

  const orderIndex = day.exercises.find((e) => e.exerciseId === excludeExerciseId)?.orderIndex ?? 0;
  const base = toPlanExercise(alternative, input, orderIndex);
  return {
    id: newId(),
    workoutDayId: day.id,
    exerciseId: base.exerciseId,
    orderIndex: base.orderIndex,
    sets: base.sets,
    reps: base.reps,
    durationSeconds: base.durationSeconds,
    restSeconds: base.restSeconds,
    notes: base.notes,
    createdAt: nowIso(),
    exercise: alternative,
  };
};

/**
 * Adjusts the difficulty of an entire plan by changing the fitness level.
 * Returns a new plan draft with exercises re-selected for the new level.
 */
export const adjustPlanDifficulty = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  newLevel: FitnessLevel,
): PlanDraftInput => {
  return generatePlan(catalog, { ...input, fitnessLevel: newLevel });
};

/**
 * Adjusts the duration of an entire plan.
 * Returns a new plan draft with exercises re-selected for the new duration.
 */
export const adjustPlanDuration = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  newDurationMinutes: number,
): PlanDraftInput => {
  return generatePlan(catalog, { ...input, preferredDuration: newDurationMinutes });
};

/**
 * Shortens a plan by reducing the duration.
 * Convenience wrapper that ensures minimum 5 minutes.
 */
export const shortenPlan = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  minutesToReduce: number = 5,
): PlanDraftInput => {
  const newDuration = Math.max(5, input.preferredDuration - minutesToReduce);
  return generatePlan(catalog, { ...input, preferredDuration: newDuration });
};

/**
 * Extends a plan by increasing the duration.
 * Convenience wrapper that ensures maximum 90 minutes.
 */
export const extendPlan = (
  catalog: readonly Exercise[],
  input: GeneratorInput,
  minutesToAdd: number = 5,
): PlanDraftInput => {
  const newDuration = Math.min(90, input.preferredDuration + minutesToAdd);
  return generatePlan(catalog, { ...input, preferredDuration: newDuration });
};
