/**
 * Applies the Supabase migrations, then seeds the exercise catalog.
 *
 * Run:  npm run db:migrate
 *
 * Requires `SUPABASE_DB_URL`, the direct Postgres connection string, because
 * the REST API cannot execute DDL. The connection string lives only in
 * `.env.local` and is never committed or sent to the browser.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

/** Reads a variable from the process or from `.env.local`. */
const readEnv = (key: string): string | null => {
  if (process.env[key]) return process.env[key];
  try {
    const contents = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of contents.split('\n')) {
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
  console.error(
    'SUPABASE_DB_URL is not set.\n\n' +
      'Add it to .env.local, using the connection string from\n' +
      'Supabase dashboard -> Project Settings -> Database -> Connection string.\n' +
      'Use the Session pooler (port 5432) form.',
  );
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const run = async (): Promise<void> => {
  await client.connect();
  console.log('Connected.');

  // Which migrations to apply. 0001 is skipped when its tables are already
  // present, so a re-run after a seed failure does not need a reset.
  const { rows: existing } = await client.query(`
    select count(*)::int as count
    from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
      and table_name in ('profiles','exercises','workout_plans','workout_days',
                         'workout_exercises','workout_logs','exercise_logs')
  `);
  const schemaPresent = (existing[0]?.count ?? 0) === 7;

  const files = [
    ...(schemaPresent ? [] : ['supabase/migrations/0001_initial_schema.sql']),
    'supabase/migrations/0002_row_level_security.sql',
  ];

  if (schemaPresent) {
    console.log('Schema already present; skipping 0001.');
  }

  for (const file of files) {
    const sql = readFileSync(resolve(root, file), 'utf8');
    process.stdout.write(`Applying ${file} ... `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (error) {
      console.log('FAILED');
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
      return;
    }
  }

  const seedSql = readFileSync(resolve(root, 'supabase/seed.sql'), 'utf8');
  process.stdout.write('Seeding exercises ... ');
  try {
    await client.query(seedSql);
    const { rows } = await client.query('select count(*)::int as count from public.exercises');
    console.log(`ok (${rows[0]?.count ?? 0} exercises)`);
  } catch (error) {
    console.log('FAILED');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  // Report which tables have RLS enabled, so a silent failure is visible.
  const { rows: rls } = await client.query(`
    select relname as table, relrowsecurity as rls, relforcerowsecurity as forced
    from pg_class
    where relnamespace = 'public'::regnamespace and relkind = 'r'
    order by relname
  `);
  console.log('\nRow level security:');
  for (const row of rls) {
    console.log(`  ${String(row.table).padEnd(20)} rls=${row.rls} forced=${row.forced}`);
  }
};

run()
  .catch((error: unknown) => {
    console.error('\nMigration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });
