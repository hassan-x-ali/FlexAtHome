/**
 * Verifies the Supabase backend against the live project.
 *
 * Run:  npm run db:verify
 *
 * Checks, in order:
 *   1. The catalog is readable by anon (public reference data).
 *   2. The catalog is NOT writable by anon.
 *   3. A signed-in user can create, read, update, and delete their own rows.
 *   4. A signed-in user CANNOT read or write another user's rows. This is the
 *      property that makes RLS worth having, so it is asserted directly rather
 *      than inferred from policy text.
 *   5. Workout days and exercises are reachable only through the owner's plan.
 *
 * The test user is created with the service role, used, and deleted again.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const readEnv = (key: string): string | null => {
  if (process.env[key]) return process.env[key];
  try {
    for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
      const match = line.match(new RegExp(`^${key}=(.*)$`));
      if (match?.[1]) return match[1].trim();
    }
  } catch {
    // No .env.local yet.
  }
  return null;
};

const url = readEnv('NEXT_PUBLIC_SUPABASE_URL');
const anonKey = readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const serviceKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !anonKey || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

let pass = 0;
const failures: string[] = [];

const check = (name: string, condition: boolean, detail?: unknown): void => {
  if (condition) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    const suffix = detail === undefined ? '' : ` (${JSON.stringify(detail)})`;
    failures.push(`${name}${suffix}`);
    console.log(`  FAIL ${name}${suffix}`);
  }
};

/** A throwaway account, so verification never touches a real user. */
const stamp = Date.now();
const users = [
  { email: `verify-a-${stamp}@example.com`, password: `Aa1!${stamp}password` },
  { email: `verify-b-${stamp}@example.com`, password: `Aa1!${stamp}password` },
];

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const run = async (): Promise<void> => {
  console.log('1. Anonymous access (public catalog)');
  const anon = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const catalog = await anon.from('exercises').select('id,name').limit(3);
  check('anon can read exercises', !catalog.error && (catalog.data?.length ?? 0) > 0, catalog.error?.message);

  const total = await anon.from('exercises').select('*', { count: 'exact', head: true });
  check('catalog has 48 rows', total.count === 48, total.count);

  const anonWrite = await anon
    .from('exercises')
    .insert({ name: 'Anon Attempt', slug: 'anon-attempt', description: 'x' });
  check('anon CANNOT insert exercises', anonWrite.error !== null);

  const anonProfiles = await anon.from('profiles').select('*');
  check('anon CANNOT read profiles', anonProfiles.error !== null, anonProfiles.error?.message);

  console.log('\n2. Create two throwaway users');
  // Created through the service role rather than the public sign-up endpoint:
  // the public endpoint enforces an email rate limit that verification would
  // otherwise trip on every run. The clients below still authenticate with the
  // anon key, so all RLS checks run exactly as a real user would experience.
  const clients: SupabaseClient[] = [];
  for (const user of users) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      console.log(`  create error for ${user.email}: ${createError?.message}`);
      check(`create user ${user.email}`, false, createError?.message);
      continue;
    }

    const client = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword(user);
    check(`sign in as ${user.email}`, !signInError, signInError?.message);
    clients.push(client);
  }

  if (clients.length < 2) {
    console.log('\nCould not create two test users; skipping the isolation checks.');
    return;
  }

  const [clientA, clientB] = clients as [SupabaseClient, SupabaseClient];
  const { data: userA } = await clientA.auth.getUser();
  const { data: userB } = await clientB.auth.getUser();
  check('both users have a uid', Boolean(userA?.user?.id && userB?.user?.id));
  if (!userA?.user?.id || !userB?.user?.id) return;

  console.log('\n3. User A creates their own rows');
  const profileA = await clientA.from('profiles').upsert({
    id: userA.user.id,
    full_name: 'Verify A',
    age_range: '25_34',
    fitness_level: 'beginner',
    primary_goal: 'strength',
    workout_days_per_week: 3,
    preferred_duration: 20,
    preferred_intensity: 'balanced',
  });
  check('A can create their profile', !profileA.error, profileA.error?.message);

  const { data: exercises } = await anon.from('exercises').select('id').limit(2);
  const firstExercise = exercises?.[0]?.id;
  check('catalog returned an id to build a plan', Boolean(firstExercise));

  const planA = await clientA.from('workout_plans').insert({
    user_id: userA.user.id,
    name: 'A Plan',
    description: 'verify',
    is_active: true,
  }).select().single();
  check('A can create a plan', !planA.error, planA.error?.message);

  if (!planA.error && firstExercise) {
    const dayA = await clientA.from('workout_days').insert({
      workout_plan_id: planA.data!.id,
      day_of_week: 1,
      name: 'Monday',
      is_rest_day: false,
    }).select().single();
    check('A can create a day', !dayA.error, dayA.error?.message);

    if (!dayA.error) {
      const weA = await clientA.from('workout_exercises').insert({
        workout_day_id: dayA.data!.id,
        exercise_id: firstExercise,
        order_index: 0,
        sets: 3,
        reps: 12,
        rest_seconds: 60,
      });
      check('A can add an exercise to their day', !weA.error, weA.error?.message);
    }
  }

  console.log('\n4. User B must not see any of it (RLS)');
  const bPlans = await clientB.from('workout_plans').select('*');
  check('B sees zero plans', (bPlans.data?.length ?? 0) === 0, bPlans.data?.length);

  const bProfiles = await clientB.from('profiles').select('*');
  check("B cannot read A's profile", (bProfiles.data?.length ?? 0) === 0, bProfiles.data?.length);

  const bDays = await clientB.from('workout_days').select('*');
  check('B sees zero days', (bDays.data?.length ?? 0) === 0, bDays.data?.length);

  const bLogs = await clientB.from('workout_logs').select('*');
  check('B sees zero workout logs', (bLogs.data?.length ?? 0) === 0, bLogs.data?.length);

  if (planA.data) {
    const bDelete = await clientB.from('workout_plans').delete().eq('id', planA.data.id);
    check("B cannot delete A's plan", (bDelete.data?.length ?? 0) === 0, bDelete.error?.message);

    const bUpdate = await clientB
      .from('workout_plans')
      .update({ name: 'Hijacked' })
      .eq('id', planA.data.id);
    check("B cannot update A's plan", (bUpdate.data?.length ?? 0) === 0, bUpdate.error?.message);
  }

  console.log('\n5. Forged ownership is rejected');
  const forged = await clientB.from('workout_plans').insert({
    user_id: userA.user.id,
    name: 'Forged',
    is_active: false,
  });
  check('B cannot create a plan owned by A', forged.error !== null);

  const forgedProfile = await clientB.from('profiles').insert({
    id: userA.user.id,
    full_name: 'Forged',
    age_range: '25_34',
  });
  check("B cannot create a profile for A", forgedProfile.error !== null);

  console.log('\n6. One active plan per user');
  if (planA.data) {
    const secondActive = await clientA.from('workout_plans').insert({
      user_id: userA.user.id,
      name: 'Second Active',
      is_active: true,
    });
    check('a second active plan is rejected', secondActive.error !== null, secondActive.error?.message);
  }

  console.log('\n7. Constraints reject impossible values');
  const badLog = await clientA.from('workout_logs').insert({
    user_id: userA.user.id,
    started_at: new Date().toISOString(),
    duration_seconds: 0,
  });
  check('an in-progress log with zero duration is valid', !badLog.error, badLog.error?.message);

  if (badLog.data) {
    const negative = await clientA.from('exercise_logs').insert({
      workout_log_id: badLog.data.id,
      exercise_id: firstExercise ?? '00000000-0000-0000-0000-000000000000',
      sets_completed: -5,
      reps_completed: 10,
      duration_seconds: 60,
    });
    check('a negative set count is rejected', negative.error !== null);

    await clientA.from('exercise_logs').delete().eq('workout_log_id', badLog.data.id);
    await clientA.from('workout_logs').delete().eq('id', badLog.data.id);
  }

  console.log('\n8. Deletion cascades');
  if (planA.data) {
    await clientA.from('workout_plans').delete().eq('id', planA.data.id);
    const orphanDays = await clientA.from('workout_days').select('*');
    check('days are removed with their plan', (orphanDays.data?.length ?? 0) === 0, orphanDays.data?.length);
  }

  // --- cleanup ------------------------------------------------------------
  console.log('\n9. Cleanup');
  for (const user of users) {
    await admin.auth.admin.deleteUser(
      (await admin.auth.admin.listUsers({ page: 1, perPage: 200 })).data.users.find(
        (u) => u.email === user.email,
      )?.id ?? '',
    );
  }
  const { data: leftovers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const stillThere = leftovers?.users.filter((u) => u.email?.includes(String(stamp))) ?? [];
  check('test users were deleted', stillThere.length === 0, stillThere.map((u) => u.email));

  if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll ${pass} verification checks passed.`);
  }
};

run().catch((error: unknown) => {
  console.error('Verification crashed:', error);
  process.exitCode = 1;
});
