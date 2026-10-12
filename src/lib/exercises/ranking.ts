/**
 * Ranking for the "best exercises for X" view.
 *
 * The output is a *suggestion list for one person under one goal*, never a claim
 * that an exercise is universally best. Two rules encode that:
 *
 *  1. Anything harder than the viewer's level is removed, not down-ranked. A
 *     beginner is not shown a handstand drill with a "you might like this" note.
 *  2. A movement the profile says to avoid is removed for the same reason.
 *
 * The score then orders what survives, so the list reflects relevance to the
 * requested body part, the viewer's level, and their goal.
 */
import type { BodyPart, Exercise, FitnessLevel, PrimaryGoal } from '@/lib/domain/types';
import { difficultyRank } from '@/lib/ui/labels';

/** The body parts that get a ranked section. */
export const RANKED_BODY_PARTS: readonly BodyPart[] = [
  'chest',
  'back',
  'legs',
  'core',
  'glutes',
  'shoulders',
  'full_body',
];

export type RankContext = {
  /** The viewer's level. `null` means no profile, so nothing is filtered out. */
  level: FitnessLevel | null;
  goal: PrimaryGoal | null;
  avoid: readonly string[];
};

export type RankedExercise = {
  exercise: Exercise;
  score: number;
  /** Short, human-readable reasons, so the ranking is explainable. */
  reasons: string[];
};

/**
 * How much a goal cares about each kind of movement. Kept small and explicit
 * rather than a weight matrix, so the intent is readable.
 */
const GOAL_AFFINITY: Record<PrimaryGoal, { type: string; weight: number }[]> = {
  general_fitness: [
    { type: 'bodyweight_squat', weight: 1 },
    { type: 'push_up', weight: 1 },
    { type: 'plank', weight: 1 },
  ],
  strength: [
    { type: 'bodyweight_squat', weight: 2 },
    { type: 'lunge', weight: 2 },
    { type: 'push_up', weight: 1.5 },
    { type: 'bridge', weight: 1.5 },
  ],
  muscle: [
    { type: 'push_up', weight: 2 },
    { type: 'bodyweight_squat', weight: 1.5 },
    { type: 'lunge', weight: 1.5 },
  ],
  endurance: [
    { type: 'burpee', weight: 2.5 },
    { type: 'mountain_climber', weight: 2.5 },
    { type: 'jump', weight: 2 },
    { type: 'locomotion', weight: 2 },
  ],
  weight_loss: [
    { type: 'burpee', weight: 2.5 },
    { type: 'jump', weight: 2.5 },
    { type: 'mountain_climber', weight: 2.5 },
    { type: 'locomotion', weight: 2 },
  ],
  mobility: [
    { type: 'stretch', weight: 3 },
    { type: 'balance', weight: 2 },
    { type: 'plank', weight: 1 },
  ],
  consistency: [
    { type: 'push_up', weight: 1.5 },
    { type: 'bodyweight_squat', weight: 1.5 },
    { type: 'plank', weight: 1.5 },
  ],
};

/** Movement types that tend to involve jumping or impact on the joints. */
const IMPACT_TYPES = new Set(['jump', 'burpee']);

const matchesAvoid = (exercise: Exercise, avoid: readonly string[]): boolean => {
  if (avoid.length === 0) return false;
  const haystack = [
    exercise.name.toLowerCase(),
    exercise.exerciseType,
    ...exercise.bodyParts,
    ...exercise.primaryMuscles,
  ];
  return avoid.some((term) => {
    const needle = term.trim().toLowerCase();
    return needle.length > 0 && haystack.some((v) => v.includes(needle));
  });
};

/**
 * Rank the catalog for one body part.
 *
 * `limit` caps the list; `null` returns everything that passed the gates.
 */
export const rankExercisesFor = (
  all: readonly Exercise[],
  bodyPart: BodyPart,
  context: RankContext,
  limit: number | null = 6,
): RankedExercise[] => {
  const ceiling = context.level ? difficultyRank(context.level) : Number.POSITIVE_INFINITY;

  const scored: RankedExercise[] = [];

  for (const exercise of all) {
    // Gate 1: only exercises that actually target this body part.
    const isPrimary = exercise.primaryMuscles.length > 0 && exercise.bodyParts.includes(bodyPart);
    if (!isPrimary) continue;

    // Gate 2: never suggest something above the viewer's level.
    if (difficultyRank(exercise.difficulty) > ceiling) continue;

    // Gate 3: honour the profile's avoid list.
    if (matchesAvoid(exercise, context.avoid)) continue;

    const reasons: string[] = [];
    let score = 0;

    // Body-part relevance. Naming the part as a primary target is the strongest
    // signal the data carries.
    if (exercise.bodyParts[0] === bodyPart) {
      score += 3;
      reasons.push(`Targets ${bodyPart.replace('_', ' ')} directly`);
    } else {
      score += 1.5;
    }

    // Goal fit.
    const affinity = context.goal ? GOAL_AFFINITY[context.goal] : [];
    const best = affinity.find((a) => a.type === exercise.exerciseType);
    if (best) {
      score += best.weight;
      reasons.push(`Suits a ${context.goal?.replace('_', ' ')} focus`);
    }

    // Level fit. A movement close to the viewer's level is easier to hold, and
    // one well below it is less useful as a suggestion.
    const gap = ceiling - difficultyRank(exercise.difficulty);
    if (Number.isFinite(ceiling)) {
      score += Math.max(0, 2 - gap);
      if (gap === 0) reasons.push('Matches your current level');
    }

    // Impact is a tie-breaker only. It is not a safety judgement, and the app
    // does not claim low-impact movement is safer for everyone.
    if (IMPACT_TYPES.has(exercise.exerciseType) && !best) {
      score -= 0.5;
    }

    scored.push({ exercise, score, reasons: reasons.slice(0, 2) });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable, readable tie-break so equal scores do not reshuffle per render.
    return a.exercise.name.localeCompare(b.exercise.name);
  });

  return typeof limit === 'number' ? scored.slice(0, limit) : scored;
};
