/**
 * Drops every table this app owns, plus the enum types and helper function its
 * migrations create.
 *
 * Run:  npm run db:reset
 *
 * This is destructive. `exercises` holds the shared catalog and is re-seeded by
 * `npm run db:migrate` immediately afterwards, so nothing is permanently lost.
 * A pre-rebuild backup of any pre-existing rows should exist before this runs.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

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

const databaseUrl = readEnv('SUPABASE_DB_URL');
if (!databaseUrl) {
  console.error('SUPABASE_DB_URL is not set.');
  process.exit(1);
}

const DROP_SQL = `
begin;

-- Children first, so no foreign key blocks a drop.
drop table if exists public.exercise_logs     cascade;
drop table if exists public.workout_logs      cascade;
drop table if exists public.workout_exercises cascade;
drop table if exists public.workout_days      cascade;
drop table if exists public.workout_plans     cascade;
drop table if exists public.profiles          cascade;
drop table if exists public.exercises         cascade;

-- Enum types created by 0001, if the previous run got that far.
do $$
declare t text;
begin
  foreach t in array array[
    'public.muscle_group', 'public.exercise_type', 'public.body_part',
    'public.gender', 'public.age_range', 'public.preferred_intensity',
    'public.primary_goal', 'public.fitness_level', 'public.equipment'
  ]
  loop
    execute format('drop type if exists %s cascade', t);
  end loop;
end $$;

drop function if exists public.set_updated_at() cascade;

commit;
`;

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const run = async (): Promise<void> => {
  await client.connect();

  // Show what is about to be destroyed, so the count is on the record.
  const { rows: before } = await client.query(`
    select
      (select count(*) from public.exercises) as exercises,
      (select count(*) from public.profiles)  as profiles,
      (select count(*) from public.workout_plans) as plans,
      (select count(*) from public.workout_logs)  as logs
  `);
  console.log('About to drop. Row counts:');
  console.log(`  exercises=${before[0]?.exercises} profiles=${before[0]?.profiles} ` +
    `plans=${before[0]?.plans} logs=${before[0]?.logs}`);

  const confirmed = process.argv.includes('--yes');
  if (!confirmed) {
    console.log('\nRe-run with --yes to proceed.');
    await client.end();
    process.exit(1);
  }

  console.log('\nDropping...');
  await client.query(DROP_SQL);

  const { rows } = await client.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
  `);
  console.log(`Done. Remaining tables in public: ${rows[0]?.count ?? 0}`);
};

run()
  .catch((error: unknown) => {
    console.error('Reset failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });
