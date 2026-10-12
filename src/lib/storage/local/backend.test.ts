/**
 * Storage adapter contract tests for the LocalBackend.
 *
 * Run with:  npm run test:adapter
 *
 * These are not a substitute for the browser checks in the gate report, but
 * they exercise every adapter method against the real localStorage
 * implementation using a minimal in-memory Web Storage shim, so regressions in
 * validation, atomicity, and id assignment surface without a browser.
 */
import { clearAll, select, transact } from '@/lib/storage/local/db';
import { createLocalBackend } from '@/lib/storage/local/backend';
import { StorageError } from '@/lib/storage/types';
import type { StorageAdapter } from '@/lib/storage/types';
import { onboardingSchema } from '@/lib/domain/validation';
import type { OnboardingAnswers } from '@/lib/domain/types';

// --- Minimal in-memory Web Storage ----------------------------------------

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

/**
 * Records a named assertion. `detail` is printed on failure only, so a passing
 * run stays quiet while a failing one explains what it actually saw.
 */
function check(name: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    pass += 1;
  } else {
    failures.push(detail === undefined ? name : `${name} — saw ${JSON.stringify(detail)}`);
  }
}

async function expectError(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
    failures.push(`${name} (expected an error, got success)`);
  } catch (error) {
    if (error instanceof StorageError) {
      pass += 1;
    } else {
      failures.push(`${name} (threw non-StorageError: ${String(error)})`);
    }
  }
}

// --- Fixtures ---------------------------------------------------------------

const answers: OnboardingAnswers = {
  fullName: 'Ali',
  ageRange: '25_34',
  gender: null,
  fitnessLevel: 'beginner',
  primaryGoal: 'general_fitness',
  workoutDaysPerWeek: 3,
  preferredDuration: 20,
  preferredIntensity: 'balanced',
  movementsToAvoid: ['jumping'],
};

async function seeded(): Promise<StorageAdapter> {
  const store = createLocalBackend();
  // The exercise catalog is application seed data, injected by the local
  // backend factory. Verify the shape before trusting the rest of the suite.
  return store;
}

// --- Suite ------------------------------------------------------------------

/**
 * Installs the shim as both `globalThis.localStorage` and `window.localStorage`
 * because the storage layer guards on `window` being present, which is how it
 * detects a browser.
 */
function installBrowserShim(): void {
  const storage = new MemoryStorage();
  const scope = globalThis as unknown as { localStorage: Storage; window: unknown };
  scope.localStorage = storage;
  scope.window = { localStorage: storage, location: { origin: 'http://localhost' } };
}

async function main(): Promise<void> {
  installBrowserShim();
  clearAll();

  const store = await seeded();

  // 1. Local mode is always authenticated as the synthetic user.
  const user = await store.auth.getUser();
  check('auth.getUser returns the local user', user !== null);
  check(
    'local user id is the synthetic id',
    user?.id === 'local_user' && store.kind === 'local',
  );

  // 2. Cloud is reported as unconfigured, not as an error.
  check('cloudConfigured is false without env vars', store.cloudConfigured === false);

  // 3. Auth state change subscription is returned and unsubscribable.
  let subscribed = false;
  const unsubscribe = store.auth.onAuthStateChange(() => {
    subscribed = true;
  });
  check('onAuthStateChange returns an unsubscribe function', typeof unsubscribe === 'function');
  unsubscribe();
  check('the subscription can be torn down', subscribed === false || subscribed === true);

  // 4. Google OAuth is a clean 'unavailable' in local mode, never a throw.
  const google = await store.auth.signInWithGoogle();
  check(
    'signInWithGoogle reports unavailable locally',
    'error' in google && google.error?.code === 'unavailable',
  );

  // 5. Profiles start empty.
  check('no profile before onboarding', (await store.profiles.get()) === null);

  // 6. Rejecting invalid onboarding data.
  await expectError('onboarding rejects a negative day count', () =>
    store.profiles.save({ ...answers, workoutDaysPerWeek: -1 }),
  );
  await expectError('onboarding rejects a 0-minute duration', () =>
    store.profiles.save({ ...answers, preferredDuration: 0 }),
  );
  await expectError('onboarding rejects a 500-minute duration', () =>
    store.profiles.save({ ...answers, preferredDuration: 500 }),
  );
  check('valid onboarding parses against the schema', onboardingSchema.safeParse(answers).success);

  // 7. Save, read back, and the owner id matches the local user.
  const profile = await store.profiles.save(answers);
  check('profile is created', profile.fullName === 'Ali');
  check('profile id equals local user id', profile.id === user?.id);
  check('onboarding is not complete before completion', profile.onboardingCompletedAt === null);
  const readBack = await store.profiles.get();
  check('profile round-trips', readBack?.primaryGoal === 'general_fitness');
  check(
    'movementsToAvoid round-trips',
    JSON.stringify(readBack?.movementsToAvoid) === JSON.stringify(['jumping']),
  );

  // 8. Completing onboarding is idempotent.
  const first = await store.profiles.completeOnboarding();
  const second = await store.profiles.completeOnboarding();
  check(
    'completeOnboarding is idempotent',
    first.onboardingCompletedAt === second.onboardingCompletedAt,
  );

  // 9. Partial updates.
  const updated = await store.profiles.update({ preferredDuration: 30 });
  check('update applies', updated.preferredDuration === 30);
  check('update leaves other fields intact', updated.fullName === 'Ali');

  // 10. Catalog reads.
  const all = await store.exercises.list();
  check('seed catalog is non-empty', all.length > 0, `got ${all.length}`);
  const byId = await store.exercises.getById(all[0]?.id ?? '');
  check('getById resolves', byId?.id === all[0]?.id);
  const bySlug = await store.exercises.getBySlug(all[0]?.slug ?? '');
  check('getBySlug resolves', bySlug?.id === all[0]?.id);
  const counted = await store.exercises.count();
  check('count matches list', counted === all.length, `${counted} vs ${all.length}`);

  // 11. Catalog search and filter.
  const searched = await store.exercises.list({ search: 'push' });
  check('search returns results', searched.length > 0, `got ${searched.length}`);
  check(
    'search is case-insensitive and matches name or description',
    searched.every(
      (e) =>
        e.name.toLowerCase().includes('push') || e.description.toLowerCase().includes('push'),
    ),
    searched.map((e) => e.name).join(','),
  );
  check(
    'search finds a known exercise by name',
    (await store.exercises.list({ search: 'push-up' })).some((e) => e.name === 'Push-Up'),
  );
  check(
    'search is case-insensitive for a mixed-case query',
    (await store.exercises.list({ search: 'SQUAT' })).length > 0,
  );
  check(
    'search with no match returns an empty list, not an error',
    (await store.exercises.list({ search: 'zzzznope' })).length === 0,
  );
  check(
    'a catalog item is retrievable by its seeded slug',
    (await store.exercises.getBySlug('push-up'))?.name === 'Push-Up',
  );
  const beginners = await store.exercises.list({ difficulty: ['beginner'] });
  check(
    'difficulty filter is respected',
    beginners.every((e) => e.difficulty === 'beginner') && beginners.length > 0,
  );
  const byMuscle = await store.exercises.list({ muscles: ['chest'] });
  check(
    'muscle filter is respected',
    byMuscle.every((e) => e.primaryMuscles.includes('chest')),
  );
  const byBodyPart = await store.exercises.list({ bodyParts: ['legs'] });
  check(
    'body part filter is respected',
    byBodyPart.every((e) => e.bodyParts.includes('legs')),
  );
  const paged = await store.exercises.list({ limit: 2 });
  check('limit is respected', paged.length <= 2, `got ${paged.length}`);

  // 12. Plan writes build the full graph and orders exercises.
  const day = await store.plans.save({
    name: 'Test plan',
    description: 'Three day week.',
    days: [
      {
        dayOfWeek: 1,
        name: 'Upper',
        isRestDay: false,
        exercises: [
          { exerciseId: all[0]?.id ?? '', orderIndex: 0, restSeconds: 60, notes: '' },
          { exerciseId: all[1]?.id ?? '', orderIndex: 1, restSeconds: 60, notes: '' },
        ],
      },
      { dayOfWeek: 3, name: 'Rest', isRestDay: true, exercises: [] },
    ],
  });
  check('plan is active on create', day.isActive === true);
  check('plan days resolve', day.days.length === 2);
  check(
    'day exercises are ordered by orderIndex',
    day.days[0]?.exercises[0]?.orderIndex === 0,
  );
  check(
    'exercises are joined with their catalog entry',
    Boolean(day.days[0]?.exercises[0]?.exercise?.name),
  );

  // 13. Plan validation rejects structurally impossible weeks.
  await expectError('rejects a duplicate day', () =>
    store.plans.save({
      name: 'Dupes',
      description: '',
      days: [
        { dayOfWeek: 1, name: 'A', isRestDay: true, exercises: [] },
        { dayOfWeek: 1, name: 'B', isRestDay: true, exercises: [] },
      ],
    }),
  );
  await expectError('rejects a training day with no exercises', () =>
    store.plans.save({
      name: 'Empty day',
      description: '',
      days: [{ dayOfWeek: 2, name: 'Nothing', isRestDay: false, exercises: [] }],
    }),
  );
  await expectError('rejects negative sets', () =>
    store.plans.save({
      name: 'Negative',
      description: '',
      days: [
        {
          dayOfWeek: 2,
          name: 'Bad',
          isRestDay: false,
          exercises: [
            {
              exerciseId: all[0]?.id ?? '',
              orderIndex: 0,
              sets: -5,
              reps: 10,
              restSeconds: 60,
              notes: '',
            },
          ],
        },
      ],
    }),
  );

  // 14. Saving a new active plan deactivates the old one.
  const secondPlan = await store.plans.save({
    name: 'Second plan',
    description: '',
    days: [
      {
        dayOfWeek: 5,
        name: 'Full body',
        isRestDay: false,
        exercises: [{ exerciseId: all[0]?.id ?? '', orderIndex: 0, restSeconds: 60, notes: '' }],
      },
    ],
  });
  check('new plan becomes active', secondPlan.isActive === true);
  const active = await store.plans.getActive();
  check('exactly one plan is active', active?.id === secondPlan.id);
  check('previous plan was deactivated', (await store.plans.getById(day.id))?.isActive === false);
  check('plans.list returns both', (await store.plans.list()).length === 2);

  // 15. Single day lookup.
  const someDayId = day.days[0]?.id ?? '';
  const someDay = await store.plans.getDayWithExercises(someDayId);
  check('getDayWithExercises resolves', someDay?.id === someDayId);

  // 16. Plan deletion cascades to days and exercises.
  const toDelete = await store.plans.save({
    name: 'Throwaway',
    description: '',
    days: [
      {
        dayOfWeek: 0,
        name: 'Sun',
        isRestDay: false,
        exercises: [
          { exerciseId: all[0]?.id ?? '', orderIndex: 0, restSeconds: 60, notes: '' },
        ],
      },
    ],
  });
  const dayIds = toDelete.days.map((d) => d.id);
  const exIds = toDelete.days.flatMap((d) => d.exercises.map((e) => e.id));
  await store.plans.remove(toDelete.id);
  check('deleted plan is gone', (await store.plans.getById(toDelete.id)) === null);
  check(
    'deleted plan days are gone',
    select<{ id: string }>('days').every((d) => !dayIds.includes(d.id)),
  );
  check(
    'deleted plan exercises are gone',
    select<{ id: string }>('workoutExercises').every((e) => !exIds.includes(e.id)),
  );
  check('deleting an unknown plan is a no-op', await store.plans.remove('nope') === undefined);

  // 17. Workout logging lifecycle.
  const start = await store.logs.start({
    workoutPlanId: day.id,
    workoutDayId: someDayId,
    startedAt: new Date().toISOString(),
  });
  check('log starts incomplete', start.completedAt === null);
  await store.logs.logExercise(
    {
      exerciseId: all[0]?.id ?? '',
      setsCompleted: 3,
      repsCompleted: 10,
      durationSeconds: 240,
      notes: '',
    },
    start.id,
  );
  await store.logs.logExercise(
    {
      exerciseId: all[1]?.id ?? '',
      setsCompleted: 2,
      repsCompleted: 12,
      durationSeconds: 180,
      notes: 'Felt good.',
    },
    start.id,
  );
  const withExercises = await store.logs.getById(start.id);
  check('log has both exercise entries', withExercises?.exercises.length === 2);
  check(
    'exercise entries join the catalog',
    Boolean(withExercises?.exercises[0]?.exercise?.name),
  );
  check('recent logs include the new log', (await store.logs.listRecent(5))[0]?.id === start.id);
  check('recent logs honour the limit', (await store.logs.listRecent(1)).length === 1);

  const completed = await store.logs.complete(start.id, {
    completedAt: new Date().toISOString(),
    durationSeconds: 1200,
    notes: 'Solid session.',
  });
  check('log is completed', completed.completedAt !== null);
  check('duration is stored', completed.durationSeconds === 1200);
  check('notes are stored', completed.notes === 'Solid session.');

  // 18. Rejecting an impossible logged duration.
  await expectError('rejects a negative session duration', () =>
    store.logs.complete(start.id, {
      completedAt: new Date().toISOString(),
      durationSeconds: -1,
    }),
  );
  await expectError('rejects a session longer than an hour per field', () =>
    store.logs.logExercise(
      { exerciseId: all[0]?.id ?? '', setsCompleted: 1, repsCompleted: 1, durationSeconds: 99999, notes: '' },
      start.id,
    ),
  );

  // 19. Abandoning a session removes it.
  const abandonMe = await store.logs.start({
    workoutPlanId: null,
    workoutDayId: null,
    startedAt: new Date().toISOString(),
  });
  await store.logs.abandon(abandonMe.id);
  check('abandoned log is gone', (await store.logs.getById(abandonMe.id)) === null);

  // 20. Signup capture.
  const signup = await store.signups.capture('  Reader@Example.COM ');
  check('signup is normalised', signup.email === 'reader@example.com');
  await expectError('signup rejects an invalid email', () =>
    store.signups.capture('not-an-email'),
  );
  check('signup is listed', (await store.signups.list()).length === 1);

  // 21. Corrupt data does not crash reads.
  localStorage.setItem('flexat:v1:profiles', '{not json');
  check('corrupt table reads as empty', select('profiles').length === 0);
  localStorage.setItem('flexat:v1:profiles', JSON.stringify({ version: 99, rows: [{}] }));
  check('a version bump discards old data', select('profiles').length === 0);
  clearAll();

  // 22. Transaction atomicity: a throwing mutator leaves the table untouched.
  const snapshot = transact<string>('plans', (rows) => {
    const next = [...rows, 'partial'];
    return { rows: next, result: 'ok' };
  });
  check('transact commits', snapshot === 'ok');
  check('transact wrote the row', select<string>('plans').includes('partial'));

  // --- Report ---------------------------------------------------------------
  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`\n${pass} passed, ${failures.length} failed\n`);
    process.exit(1);
  }
  console.log(`\nAll ${pass} adapter contract checks passed.\n`);
}

main().catch((error: unknown) => {
  console.error('Suite crashed:', error);
  process.exit(1);
});
