/**
 * Generator contract tests.
 *
 * Run with:  npm run test:generator
 *
 * The generator is pure, so it can be exercised without a browser. These checks
 * are the evidence that recommendations respond to level AND goal, rather than
 * an assertion that they do.
 */
import { SEED_EXERCISES } from '@/lib/domain/exercise-seed';
import {
  generatePlan,
  isAvoidable,
  type GeneratorInput,
  selectExercisesForDay,
  trainingDayIndices,
  withinDifficultyCeilingForTest,
} from '@/lib/generator/rules';
import { planDraftSchema } from '@/lib/domain/validation';
import type { PlanDraftInput } from '@/lib/domain/validation';
import type { Exercise } from '@/lib/domain/types';

let pass = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    pass += 1;
  } else {
    failures.push(detail === undefined ? name : `${name} — saw ${JSON.stringify(detail)}`);
  }
}

const base: GeneratorInput = {
  fitnessLevel: 'beginner',
  primaryGoal: 'general_fitness',
  preferredIntensity: 'balanced',
  preferredDuration: 20,
  workoutDaysPerWeek: 3,
  movementsToAvoid: [],
};

/** All exercises in a plan, resolved back to catalog entries. */
const exercisesIn = (plan: PlanDraftInput): Exercise[] => {
  const ids = new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  return SEED_EXERCISES.filter((e) => ids.has(e.id));
};

const difficultyCounts = (exercises: readonly Exercise[]) => ({
  beginner: exercises.filter((e) => e.difficulty === 'beginner').length,
  intermediate: exercises.filter((e) => e.difficulty === 'intermediate').length,
  advanced: exercises.filter((e) => e.difficulty === 'advanced').length,
});

function main(): void {
  // --- 1. A plan is produced and is structurally valid ------------------
  const plan = generatePlan(SEED_EXERCISES, base);
  const parsed = planDraftSchema.safeParse(plan);
  check('plan validates against the storage schema', parsed.success, parsed.success ? undefined : parsed.error.issues);

  const trainingDays = plan.days.filter((d) => !d.isRestDay);
  check('plan has 3 training days', trainingDays.length === 3, trainingDays.length);
  check('plan covers all 7 days', plan.days.length === 7, plan.days.length);
  check('rest days carry no exercises', plan.days.filter((d) => d.isRestDay).every((d) => d.exercises.length === 0));
  check('every day has a unique weekday', new Set(plan.days.map((d) => d.dayOfWeek)).size === 7);
  check('every training day has exercises', trainingDays.every((d) => d.exercises.length > 0));

  // --- 2. Training days are spread, not consecutive ----------------------
  check('3 training days are spread', trainingDayIndices(3).join(',') === '1,3,5', trainingDayIndices(3).join(','));
  check('2 training days are spread', trainingDayIndices(2).join(',') === '1,4', trainingDayIndices(2).join(','));
  check('7 training days fills the week', trainingDayIndices(7).length === 7);
  check('1 training day is a single day', trainingDayIndices(1).length === 1);

  // --- 3. Level is respected --------------------------------------------
  const beginnerPlan = generatePlan(SEED_EXERCISES, base);
  const beginnerExercises = exercisesIn(beginnerPlan);
  const beginnerSpread = difficultyCounts(beginnerExercises);
  check('a beginner plan contains no advanced movements', beginnerSpread.advanced === 0, beginnerSpread);

  const advancedInput = { ...base, fitnessLevel: 'advanced' as const };
  const advancedPlan = generatePlan(SEED_EXERCISES, advancedInput);
  const advancedSpread = difficultyCounts(exercisesIn(advancedPlan));
  check('an advanced plan reaches beyond beginner-only', advancedSpread.beginner < beginnerExercises.length, {
    beginnerSpread,
    advancedSpread,
  });

  // Same goal, different level, must produce a different plan.
  check(
    'level changes the plan',
    JSON.stringify(beginnerPlan) !== JSON.stringify(advancedPlan),
  );

  // --- 4. Goal changes the plan -----------------------------------------
  const goals = [
    'general_fitness',
    'strength',
    'muscle',
    'endurance',
    'weight_loss',
    'mobility',
    'consistency',
  ] as const;

  const goalFingerprints = new Map<string, string>();
  for (const goal of goals) {
    const goalPlan = generatePlan(SEED_EXERCISES, { ...base, primaryGoal: goal });
    const goalExercises = exercisesIn(goalPlan);
    goalFingerprints.set(goal, goalExercises.map((e) => e.id).sort().join(','));

    const goalSpread = difficultyCounts(goalExercises);
    check(`${goal}: no advanced movements for a beginner`, goalSpread.advanced === 0, goalSpread);
  }

  const uniqueGoalPlans = new Set(goalFingerprints.values());
  check('every goal produces a distinct exercise set', uniqueGoalPlans.size === goals.length, {
    unique: uniqueGoalPlans.size,
    total: goals.length,
  });

  // A mobility plan should stretch more than a muscle plan does. The catalog
  // holds 18 stretches out of 48, so the property is relative, not absolute.
  const mobilityExercises = exercisesIn(generatePlan(SEED_EXERCISES, { ...base, primaryGoal: 'mobility' }));
  const stretchShare =
    mobilityExercises.filter((e) => e.exerciseType === 'stretch').length / Math.max(1, mobilityExercises.length);

  const muscleExercises = exercisesIn(generatePlan(SEED_EXERCISES, { ...base, primaryGoal: 'muscle' }));
  const muscleStretchShare =
    muscleExercises.filter((e) => e.exerciseType === 'stretch').length / Math.max(1, muscleExercises.length);

  check(
    'a mobility plan stretches more than a muscle plan does',
    stretchShare > muscleStretchShare,
    { stretchShare: stretchShare.toFixed(2), muscleStretchShare: muscleStretchShare.toFixed(2) },
  );

  // Conditioning goals should carry more conditioning work than goals that do
  // not ask for it. Compared goal-to-goal, which is the property that matters;
  // a raw threshold would just be asserting the catalog's composition.
  const conditioningTypes = ['burpee', 'mountain_climber', 'locomotion', 'jump'];
  const conditioningShareFor = (goal: typeof goals[number]): number => {
    const exercises = exercisesIn(generatePlan(SEED_EXERCISES, { ...base, primaryGoal: goal }));
    return (
      exercises.filter((e) => conditioningTypes.includes(e.exerciseType)).length /
      Math.max(1, exercises.length)
    );
  };

  const enduranceConditioning = conditioningShareFor('endurance');
  const weightLossConditioning = conditioningShareFor('weight_loss');
  const strengthConditioning = conditioningShareFor('strength');
  const mobilityConditioning = conditioningShareFor('mobility');

  check(
    'an endurance plan carries more conditioning than a strength plan',
    enduranceConditioning > strengthConditioning,
    { endurance: enduranceConditioning.toFixed(2), strength: strengthConditioning.toFixed(2) },
  );
  check(
    'weight loss carries at least as much conditioning as endurance',
    weightLossConditioning >= enduranceConditioning,
    { weightLoss: weightLossConditioning.toFixed(2), endurance: enduranceConditioning.toFixed(2) },
  );
  check(
    'a mobility plan carries essentially no conditioning',
    mobilityConditioning === 0,
    mobilityConditioning,
  );

  // --- 5. Intensity is respected ----------------------------------------
  const cardioPlan = generatePlan(SEED_EXERCISES, {
    ...base,
    primaryGoal: 'general_fitness',
    preferredIntensity: 'cardio_heavy',
  });
  const strengthPlan = generatePlan(SEED_EXERCISES, {
    ...base,
    primaryGoal: 'general_fitness',
    preferredIntensity: 'strength_focused',
  });
  check(
    'intensity changes the plan',
    JSON.stringify(cardioPlan) !== JSON.stringify(strengthPlan),
  );

  const cardioExercises = exercisesIn(cardioPlan);
  const cardioConditioning =
    cardioExercises.filter((e) => conditioningTypes.includes(e.exerciseType)).length /
    Math.max(1, cardioExercises.length);
  const balancedExercises = exercisesIn(beginnerPlan);
  const balancedConditioning =
    balancedExercises.filter((e) => conditioningTypes.includes(e.exerciseType)).length /
    Math.max(1, balancedExercises.length);
  check('cardio-heavy raises the conditioning share', cardioConditioning >= balancedConditioning, {
    cardio: cardioConditioning.toFixed(2),
    balanced: balancedConditioning.toFixed(2),
  });

  // --- 6. Duration is treated as a budget -------------------------------
  const shortPlan = generatePlan(SEED_EXERCISES, { ...base, preferredDuration: 10 });
  const longPlan = generatePlan(SEED_EXERCISES, { ...base, preferredDuration: 45 });

  const exerciseCount = (p: PlanDraftInput) => p.days.filter((d) => !d.isRestDay)[0]?.exercises.length ?? 0;
  check('a longer session holds more exercises', exerciseCount(longPlan) > exerciseCount(shortPlan), {
    short: exerciseCount(shortPlan),
    long: exerciseCount(longPlan),
  });

  // A 10-minute session should not be stuffed with a full day's volume.
  const shortDay = shortPlan.days.filter((d) => !d.isRestDay)[0];
  check('a 10-minute session stays short', (shortDay?.exercises.length ?? 0) <= 6, shortDay?.exercises.length);
  check('a 10-minute session still has a usable minimum', (shortDay?.exercises.length ?? 0) >= 3, shortDay?.exercises.length);

  // --- 7. Days per week is respected ------------------------------------
  for (const days of [1, 2, 3, 4, 5, 6, 7]) {
    const p = generatePlan(SEED_EXERCISES, { ...base, workoutDaysPerWeek: days });
    const n = p.days.filter((d) => !d.isRestDay).length;
    check(`${days} days requested -> ${days} scheduled`, n === days, n);
    check(`${days} days requested -> still 7 days total`, p.days.length === 7, p.days.length);
  }

  // --- 8. Avoided movements are excluded --------------------------------
  const avoidJumping = generatePlan(SEED_EXERCISES, {
    ...base,
    movementsToAvoid: ['jumping'],
  });
  const jumpingCandidates = SEED_EXERCISES.filter(
    (e) => e.exerciseType === 'jump' || e.name.toLowerCase().includes('burpee'),
  );
  const avoidIds = new Set(exercisesIn(avoidJumping).map((e) => e.id));
  const leaked = jumpingCandidates.filter((e) => avoidIds.has(e.id));
  check('avoiding "jumping" removes jump and burpee movements', leaked.length === 0, leaked.map((e) => e.name));

  // The avoid matcher itself.
  const burpee = SEED_EXERCISES.find((e) => e.slug === 'burpee');
  const pushUp = SEED_EXERCISES.find((e) => e.slug === 'push-up');
  check('burpee matches the term "jumping"', burpee ? isAvoidable(burpee, ['jumping']) === false : false);
  check('push-up is unaffected by "jumping"', pushUp ? isAvoidable(pushUp, ['jumping']) : false);
  check('a 2-character term is ignored (too fuzzy)', pushUp ? isAvoidable(pushUp, ['up']) : false);
  check(
    'an empty avoid list excludes nothing',
    SEED_EXERCISES.every((e) => isAvoidable(e, [])),
  );

  // --- 9. Determinism ---------------------------------------------------
  const again = generatePlan(SEED_EXERCISES, base);
  check('the same profile produces the same plan', JSON.stringify(again) === JSON.stringify(plan));

  // --- 10. No duplicate exercise inside a session -----------------------
  for (const day of trainingDays) {
    const ids = day.exercises.map((e) => e.exerciseId);
    check(`day ${day.dayOfWeek} has no duplicate exercises`, new Set(ids).size === ids.length, ids);
  }

  // --- 11. Sessions differ across the week ------------------------------
  const fingerprints = trainingDays.map((d) => d.exercises.map((e) => e.exerciseId).sort().join(','));
  check('consecutive training days are not identical', new Set(fingerprints).size >= 2, fingerprints);

  // --- 12. Every prescribed id exists in the catalog --------------------
  const catalogIds = new Set(SEED_EXERCISES.map((e) => e.id));
  const unknown = plan.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)).filter((id) => !catalogIds.has(id));
  check('every planned exercise exists in the catalog', unknown.length === 0, unknown.length);

  // --- 13. Prescriptions are sane ---------------------------------------
  const allPrescriptionsValid = trainingDays.every((day) =>
    day.exercises.every(
      (item) =>
        (item.sets == null || item.sets >= 1) &&
        (item.reps == null || item.reps >= 1) &&
        (item.restSeconds ?? 0) >= 0 &&
        (item.orderIndex ?? 0) >= 0,
    ),
  );
  check('all prescriptions are valid', allPrescriptionsValid);

  // --- 14. Difficulty ceiling helper agrees with the plans --------------
  check(
    'difficulty ceiling helper rejects advanced for a beginner',
    SEED_EXERCISES.filter((e) => e.difficulty === 'advanced').every(
      (e) => withinDifficultyCeilingForTest(e, 'beginner') === false,
    ),
  );

  // --- 15. Robustness against a thin catalog ---------------------------
  const twoExercises = SEED_EXERCISES.slice(0, 2);
  const thinPlan = generatePlan(twoExercises, base);
  const thinParsed = planDraftSchema.safeParse(thinPlan);
  check('a 2-exercise catalog still produces a valid plan', thinParsed.success);
  check(
    'a thin catalog does not produce an empty training day',
    thinPlan.days.filter((d) => !d.isRestDay).every((d) => d.exercises.length > 0),
    thinPlan.days.filter((d) => !d.isRestDay).map((d) => d.exercises.length),
  );

  const noUsable = generatePlan(
    SEED_EXERCISES.filter((e) => e.difficulty === 'advanced'),
    base,
  );
  check(
    'an impossible avoid list degrades gracefully rather than crashing',
    Array.isArray(noUsable.days) && noUsable.days.length === 7,
  );

  // --- 16. Single-day-per-week edge case --------------------------------
  const oneDay = generatePlan(SEED_EXERCISES, { ...base, workoutDaysPerWeek: 1 });
  check('a 1-day week has exactly 6 rest days', oneDay.days.filter((d) => d.isRestDay).length === 6);

  // --- 17. selectExercisesForDay rotates emphasis -----------------------
  const day0 = selectExercisesForDay(SEED_EXERCISES, base, 0, 5).map((e) => e.id);
  const day1 = selectExercisesForDay(SEED_EXERCISES, base, 1, 5).map((e) => e.id);
  check('day index changes the selection', JSON.stringify(day0) !== JSON.stringify(day1));

  // --- report -----------------------------------------------------------
  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    console.error(`\n${pass} passed, ${failures.length} failed\n`);
    process.exit(1);
  }
  console.log(`\nAll ${pass} generator checks passed.\n`);
}

main();
