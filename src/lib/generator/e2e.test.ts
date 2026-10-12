/**
 * End-to-end generator test through the real storage adapter.
 *
 * Run:  npm run test:generator-e2e
 *
 * The generator is pure and the adapter is tested separately, but the seam
 * between them — a generated draft actually persisting and reading back — is
 * what the user experiences. This closes that gap: generate, save through the
 * adapter, read back, and assert the plan survives the round trip.
 */
import { SEED_EXERCISES } from '@/lib/domain/exercise-seed';
import { generatePlan } from '@/lib/generator/rules';
import { createLocalBackend } from '@/lib/storage/local/backend';
import { clearAll } from '@/lib/storage/local/db';
import type { StorageAdapter } from '@/lib/storage/types';
import { onboardingSchema } from '@/lib/domain/validation';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let pass = 0;
const failures: string[] = [];

const check = (name: string, condition: boolean, detail?: unknown): void => {
  if (condition) {
    pass += 1;
  } else {
    failures.push(detail === undefined ? name : `${name} — saw ${JSON.stringify(detail)}`);
  }
};

/** Onboarding answers shaped to produce a given plan. */
const seedProfile = async (store: StorageAdapter, overrides: Record<string, unknown> = {}) => {
  const base = {
    fullName: 'Test',
    ageRange: '25_34',
    gender: null,
    fitnessLevel: 'beginner',
    primaryGoal: 'general_fitness',
    workoutDaysPerWeek: 3,
    preferredDuration: 20,
    preferredIntensity: 'balanced',
    movementsToAvoid: [],
    ...overrides,
  };
  const parsed = onboardingSchema.parse(base);
  await store.profiles.save(parsed);
  return store.profiles.get();
};

const main = async (): Promise<void> => {
  const storage = new MemoryStorage();
  const scope = globalThis as unknown as { localStorage: Storage; window: unknown };
  scope.localStorage = storage;
  scope.window = { localStorage: storage, location: { origin: 'http://localhost' } };
  clearAll();

  const store = createLocalBackend();

  // --- 1. Generate -> save -> read back --------------------------------
  const profile = await seedProfile(store);
  check('profile written', profile !== null);

  const input = {
    fitnessLevel: profile!.fitnessLevel,
    primaryGoal: profile!.primaryGoal,
    preferredIntensity: profile!.preferredIntensity,
    preferredDuration: profile!.preferredDuration,
    workoutDaysPerWeek: profile!.workoutDaysPerWeek,
    movementsToAvoid: profile!.movementsToAvoid,
  };

  const draft = generatePlan(SEED_EXERCISES, input);
  const saved = await store.plans.save(draft);

  check('plan saved', saved.name === draft.name, saved.name);
  check('plan is active', saved.isActive === true);
  check('plan has 7 days', saved.days.length === 7, saved.days.length);
  check('plan has 3 training days', saved.days.filter((d) => !d.isRestDay).length === 3);

  // Read back through the adapter, as the UI would.
  const active = await store.plans.getActive();
  check('active plan reads back', active?.id === saved.id);

  const allExercises = active!.days.flatMap((d) => d.exercises);
  check('exercises survived the round trip', allExercises.length > 0, allExercises.length);
  check(
    'every exercise resolved its catalog entry',
    allExercises.every((item) => typeof item.exercise?.name === 'string'),
  );
  check(
    'prescriptions survived',
    allExercises.every(
      (item) => (item.sets ?? 0) >= 1 && item.restSeconds >= 0 && item.orderIndex >= 0,
    ),
  );

  // --- 2. Day ids resolve back into a runnable session ------------------
  const trainingDay = active!.days.find((d) => !d.isRestDay);
  const resolved = trainingDay ? await store.plans.getDayWithExercises(trainingDay.id) : null;
  check('a training day resolves by id', resolved !== null);
  check('resolved day has exercises', (resolved?.exercises.length ?? 0) > 0);

  // --- 3. Avoid list survives the round trip ---------------------------
  await seedProfile(store, { movementsToAvoid: ['jumping', 'kneeling'] });
  const avoided = await store.profiles.get();
  check('avoid list persisted', avoided?.movementsToAvoid.join(',') === 'jumping,kneeling', avoided?.movementsToAvoid);

  const avoidDraft = generatePlan(SEED_EXERCISES, {
    ...input,
    movementsToAvoid: avoided!.movementsToAvoid,
  });
  const avoidIds = new Set(avoidDraft.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)));
  const jumpExercises = SEED_EXERCISES.filter(
    (e) => e.exerciseType === 'jump' || e.exerciseType === 'burpee',
  );
  check(
    'no jumping movements survive avoidance',
    jumpExercises.every((e) => !avoidIds.has(e.id)),
    jumpExercises.filter((e) => avoidIds.has(e.id)).map((e) => e.name),
  );

  // --- 4. Regenerating replaces, not duplicates ------------------------
  const beforeCount = (await store.plans.list()).length;
  const second = generatePlan(SEED_EXERCISES, {
    ...input,
    preferredDuration: 35,
    replacePlanId: saved.id,
  });
  await store.plans.save(second);
  const afterPlans = await store.plans.list();
  check('rebuilding does not add a second plan', afterPlans.length === beforeCount, {
    before: beforeCount,
    after: afterPlans.length,
  });

  const activeAfter = await store.plans.getActive();
  check('the rebuilt plan is the active one', activeAfter?.id === saved.id);
  check(
    'the rebuilt plan has a different session length',
    JSON.stringify(activeAfter?.days) !== JSON.stringify(saved.days),
  );
  check(
    'rebuilding did not orphan the old days',
    activeAfter!.days.length === 7,
    activeAfter?.days.length,
  );

  // --- 5. A session can be logged against the generated plan -----------
  const log = await store.logs.start({
    workoutPlanId: activeAfter!.id,
    workoutDayId: trainingDay!.id,
    startedAt: new Date().toISOString(),
  });
  check('a workout log starts against the plan', log.workoutPlanId === activeAfter!.id);

  await store.logs.logExercise(
    {
      exerciseId: trainingDay!.exercises[0]!.exerciseId,
      setsCompleted: trainingDay!.exercises[0]!.sets ?? 3,
      repsCompleted: trainingDay!.exercises[0]!.reps ?? 0,
      durationSeconds: 120,
      notes: '',
    },
    log.id,
  );
  const completed = await store.logs.complete(log.id, {
    completedAt: new Date().toISOString(),
    durationSeconds: 900,
  });
  check('the session completes', completed.completedAt !== null);

  const recent = await store.logs.listRecent();
  check('the session appears in history', recent.some((l) => l.id === log.id));

  const progress = await store.logs.getById(log.id);
  check('the session has a logged exercise', (progress?.exercises.length ?? 0) === 1);

  clearAll();

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    console.error(`\n${pass} passed, ${failures.length} failed\n`);
    process.exit(1);
  }
  console.log(`\nAll ${pass} generator end-to-end checks passed.\n`);
};

main().catch((error: unknown) => {
  console.error('Suite crashed:', error);
  process.exit(1);
});
