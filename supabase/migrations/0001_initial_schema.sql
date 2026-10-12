-- ============================================================================
-- FlexAt Home — 0001_initial_schema
--
-- Bodyweight-only home workout app. Users own their profile, plans, days,
-- exercises-within-days, workout logs, and per-exercise logs. The exercise
-- catalog is shared reference data: world-readable, admin-writable.
--
-- Design notes are in docs/SCHEMA-NOTES.md.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- This file is idempotent by intent but uses bare `create type`, which has no
-- `if not exists` form in Postgres. The DO block below reports the situation
-- clearly instead of failing with a raw "already exists" error. Use
-- `npm run db:reset` to rebuild from scratch.
do $$
declare existing text[];
begin
  -- Collect the types that ALREADY exist. This is the opposite of the obvious
  -- reading: the guard is protecting against a populated schema, not an empty
  -- one. `array_agg` over zero rows returns NULL, so the NOT NULL test below
  -- is correct for "at least one exists".
  select array_agg(t) into existing
  from unnest(array[
    'fitness_level','primary_goal','preferred_intensity','age_range','gender',
    'body_part','muscle_group','exercise_type','equipment'
  ]) as t
  where exists (
    select 1 from pg_type where typname = t and typnamespace = 'public'::regnamespace
  );

  if existing is not null then
    raise exception 'Types % already exist. Run `npm run db:reset` first, or apply 0002 only.',
      existing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Shared lookup domains
-- ---------------------------------------------------------------------------
create type fitness_level as enum ('beginner', 'intermediate', 'advanced');

create type primary_goal as enum (
  'general_fitness', 'strength', 'muscle', 'endurance',
  'weight_loss', 'mobility', 'consistency'
);

create type preferred_intensity as enum ('cardio_heavy', 'strength_focused', 'balanced');

create type age_range as enum (
  'under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'
);

create type gender as enum ('female', 'male', 'non_binary', 'prefer_not_to_say');

create type body_part as enum (
  'chest', 'back', 'shoulders', 'arms', 'core', 'glutes', 'legs', 'full_body'
);

create type muscle_group as enum (
  'chest', 'lats', 'traps', 'rhomboids', 'deltoids', 'rear_deltoids',
  'rotator_cuff', 'biceps', 'triceps', 'forearms', 'abs', 'obliques',
  'erector_spine', 'thoracic_spine', 'glutes', 'quads', 'hamstrings',
  'calves', 'hip_flexors', 'adductors', 'full_body'
);

create type exercise_type as enum (
  'push_up', 'bodyweight_squat', 'lunge', 'plank', 'bridge', 'crunch',
  'burpee', 'mountain_climber', 'jump', 'balance', 'stretch', 'breathing',
  'locomotion', 'other'
);

-- Equipment is a one-value domain on purpose: the app ships no gear, and a
-- constraint is stronger than a convention. See docs/SCHEMA-NOTES.md.
create type equipment as enum ('none');

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 60),
  age_range age_range not null,
  gender gender,
  fitness_level fitness_level not null default 'beginner',
  primary_goal primary_goal not null default 'general_fitness',
  workout_days_per_week smallint not null default 3
    check (workout_days_per_week between 1 and 7),
  preferred_duration smallint not null default 20
    check (preferred_duration between 5 and 90),
  preferred_intensity preferred_intensity not null default 'balanced',
  movements_to_avoid text[] not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.onboarding_completed_at is
  'Set once when the user finishes first-run onboarding. Null means onboarding is still pending.';

create trigger if not exists profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exercises (shared reference data)
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null,
  body_parts body_part[] not null default '{}',
  primary_muscles muscle_group[] not null default '{}',
  secondary_muscles muscle_group[] not null default '{}',
  difficulty fitness_level not null default 'beginner',
  exercise_type exercise_type not null default 'other',
  equipment_required equipment not null default 'none',
  instructions text[] not null default '{}',
  form_cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  breathing_instruction text not null default '',
  recommended_sets smallint check (recommended_sets is null or recommended_sets between 1 and 20),
  recommended_reps smallint check (recommended_reps is null or recommended_reps between 1 and 200),
  recommended_duration smallint
    check (recommended_duration is null or recommended_duration between 0 and 3600),
  recommended_rest smallint not null default 60
    check (recommended_rest between 0 and 600),
  safety_notes text not null default '',
  created_at timestamptz not null default now(),
  -- A prescribing movement needs at least one way to do it.
  constraint exercises_need_a_prescription check (
    recommended_sets is not null
    or recommended_reps is not null
    or recommended_duration is not null
  )
);

create index if not exists exercises_difficulty_idx on public.exercises (difficulty);
create index if not exists exercises_body_parts_idx on public.exercises using gin (body_parts);
create index if not exists exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);
create index if not exists exercises_type_idx on public.exercises (exercise_type);

-- Full-text search over name and description.
create index if not exists exercises_search_idx on public.exercises
  using gin (to_tsvector('english', name || ' ' || description));

-- ---------------------------------------------------------------------------
-- workout_plans
-- ---------------------------------------------------------------------------
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_plans_user_id_idx on public.workout_plans (user_id);
create index if not exists workout_plans_user_active_idx on public.workout_plans (user_id, is_active)
  where is_active;

-- At most one active plan per user. Enforced in the database so a race
-- between two requests cannot leave a user with two active plans.
create unique index if not exists workout_plans_one_active_per_user_idx
  on public.workout_plans (user_id)
  where is_active;

create trigger if not exists workout_plans_set_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout_days
-- ---------------------------------------------------------------------------
create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null
    references public.workout_plans (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  name text not null check (char_length(trim(name)) between 1 and 60),
  is_rest_day boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists workout_days_plan_idx on public.workout_days (workout_plan_id);
-- A plan may not repeat the same weekday.
create unique index if not exists workout_days_unique_day_per_plan_idx
  on public.workout_days (workout_plan_id, day_of_week);

-- ---------------------------------------------------------------------------
-- workout_exercises
-- ---------------------------------------------------------------------------
create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null
    references public.workout_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index smallint not null default 0 check (order_index >= 0),
  sets smallint check (sets is null or sets between 1 and 50),
  reps smallint check (reps is null or reps between 1 and 500),
  duration_seconds smallint
    check (duration_seconds is null or duration_seconds between 0 and 3600),
  rest_seconds smallint not null default 60 check (rest_seconds between 0 and 600),
  notes text not null default '',
  created_at timestamptz not null default now(),
  -- Order positions are unique within a day.
  constraint workout_exercises_unique_order unique (workout_day_id, order_index)
);

create index if not exists workout_exercises_day_idx on public.workout_exercises (workout_day_id);
create index if not exists workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- workout_logs
-- ---------------------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  workout_day_id uuid references public.workout_days (id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer not null default 0
    check (duration_seconds between 0 and 86400),
  notes text not null default '',
  created_at timestamptz not null default now(),
  -- A session is either in progress or finished, never both.
  constraint workout_logs_completion_consistent check (
    (completed_at is null and duration_seconds = 0)
    or (completed_at is not null and completed_at >= started_at)
  )
);

create index if not exists workout_logs_user_id_idx on public.workout_logs (user_id);
create index if not exists workout_logs_user_started_idx on public.workout_logs (user_id, started_at desc);
create index if not exists workout_logs_plan_idx on public.workout_logs (workout_plan_id)
  where workout_plan_id is not null;
create index if not exists workout_logs_day_idx on public.workout_logs (workout_day_id)
  where workout_day_id is not null;

-- ---------------------------------------------------------------------------
-- exercise_logs
-- ---------------------------------------------------------------------------
create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null
    references public.workout_logs (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  sets_completed smallint not null default 0 check (sets_completed between 0 and 100),
  reps_completed smallint not null default 0 check (reps_completed between 0 and 2000),
  duration_seconds integer not null default 0
    check (duration_seconds between 0 and 86400),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_workout_log_idx on public.exercise_logs (workout_log_id);
create index if not exists exercise_logs_exercise_idx on public.exercise_logs (exercise_id);

commit;
