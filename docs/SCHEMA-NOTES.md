# Schema notes

Where the implemented schema differs from the original brief, and why.

## Deviations

### 1. Enums instead of free text for constrained columns

`fitness_level`, `primary_goal`, `preferred_intensity`, `age_range`, `gender`,
`body_part`, `muscle_group`, and `exercise_type` are Postgres enums, not
`text`. The app already treats these as closed sets, and the adapter's Zod
schemas use `z.enum`. An enum in the database makes an invalid value
impossible rather than merely unlikely, and a bad insert fails loudly instead
of silently poisoning a filter.

The cost is that adding a value requires a migration. That is acceptable for
these sets; if one ever becomes genuinely open, the column is the only thing
that changes.

### 2. `profiles` gains `age_range`, `gender`, `movements_to_avoid`, `onboarding_completed_at`

The brief's `profiles` row is missing fields that Phase 1E collects. The brief
explicitly allows adjusting the schema when a more normalized design is
genuinely better; these are added as first-class columns rather than a
`jsonb` blob so they can be indexed and constrained.

`onboarding_completed_at` exists to make "first run only" a fact about the
row, not a convention. `null` means onboarding is still pending.

### 3. `equipment` is a one-value enum

`equipment` has exactly one value, `none`, enforced by the type itself. The
brief's standing rule is zero equipment, so this makes the rule unforgeable
from the database side. If the product ever adds equipment, this is the
migration that widens it.

### 4. Deterministic catalog ids (v5 UUIDs derived from the slug)

This is the most consequential decision. The same exercise must have the same
id in localStorage and in Postgres, otherwise a plan written offline refers to
exercises that do not exist after a cloud sync.

`src/lib/domain/ids.ts` derives each catalog id as a version-5 UUID from
`flexat:exercise:<slug>` in the DNS namespace. The derivation is a
self-contained SHA-1 implementation rather than a library import, so the
identical algorithm runs in the browser bundle and in the seed script — two
implementations of the same derivation would be two chances to disagree.

User-owned rows use random v4-style UUIDs, so their ids do not leak counts.

The seed is idempotent (`on conflict (id) do update`).

### 5. One active plan per user, enforced by a partial unique index

```sql
create unique index workout_plans_one_active_per_user_idx
  on public.workout_plans (user_id)
  where is_active;
```

Two concurrent requests could otherwise both mark a plan active. The index
makes that impossible rather than merely unlikely.

### 6. A training day may not repeat a weekday

`workout_days_unique_day_per_plan_idx` on `(workout_plan_id, day_of_week)`.
The adapter's Zod schema rejects a duplicate day too, but the database is the
boundary that holds under concurrency.

### 7. Validation constraints on numeric columns

Every count and duration carries a `check` constraint mirroring the Zod rule:
sets, reps, and durations may not be negative or absurd. These are not
redundant with RLS — RLS decides *whose* row you may touch, these decide
*whether the row is valid at all*.

`workout_logs_completion_consistent` additionally encodes that a session is
either in progress (no `completed_at`, zero duration) or finished
(`completed_at` set, not before `started_at`).

### 8. `workout_logs` / `exercise_logs` use `on delete set null` for plan references

Deleting a plan should not delete someone's workout history. `on delete
cascade` is used where the child has no meaning without the parent
(`workout_days` → `workout_plans`, `workout_exercises` → `workout_days`,
`exercise_logs` → `workout_logs`).

`profiles`, `workout_plans`, and `workout_logs` cascade from `auth.users`, so
deleting an account removes the user's data.

### 9. Full-text search index

`exercises_search_idx` is a GIN index over `to_tsvector('english', name || ' ' || description)`.
The local backend filters in memory; the cloud backend uses `ilike`. Both are
covered by the adapter contract suite so the two backends cannot drift in
observable behaviour.

## RLS model

`exercises` is the only world-readable table. Every other table is verified
against `auth.uid()` in the policy itself, so authorization is enforced by the
database and not by anything the client asserts.

Child-row ownership is resolved through parents:

- `workout_days` → `workout_plans.user_id`
- `workout_exercises` → `workout_days` → `workout_plans.user_id`
- `exercise_logs` → `workout_logs.user_id`

A user cannot reach another user's data by guessing a child id.

`force row level security` is enabled on every table so the policies apply to
the table owner as well, which prevents a migration or admin path from
quietly bypassing them.

`profiles` has no client `delete` policy on purpose: account removal goes
through the auth provider, which cascades.

Application queries also filter by owner. That is for query planning and
defence in depth — RLS is the enforcement boundary, and it is not optional.

## Service-role key

`SUPABASE_SERVICE_ROLE_KEY` is read only by a seed script run from a trusted
environment. It is never imported by a page, component, or the browser
adapter, and it is not prefixed with `NEXT_PUBLIC_`. The browser and server
clients both use the anon key, so RLS applies to them.
