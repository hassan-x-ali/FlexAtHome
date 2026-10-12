-- ============================================================================
-- FlexAt Home — 0002_row_level_security
--
-- Authorization model
-- ------------------
-- `exercises` is shared reference data: readable by anyone (including
-- anonymous visitors), writable only by the service role.
--
-- Every other table is owned by a user, verified from the JWT rather than
-- from anything the client sends. Ownership of a child row is resolved
-- through its parent, so a user cannot reach another user's plan by guessing
-- a day or workout-exercise id.
--
-- `auth.uid()` is compared against the row owner. This is enforced in the
-- database: the client cannot bypass it, and every application query filters
-- by owner as well, which is a query-planning aid rather than the control.
-- ============================================================================

begin;

alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_plans     enable row level security;
alter table public.workout_days      enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs      enable row level security;
alter table public.exercise_logs     enable row level security;

-- Force RLS even for the table owner, so a bug in a migration or an admin
-- path cannot quietly bypass the policies.
alter table public.profiles          force row level security;
alter table public.exercises         force row level security;
alter table public.workout_plans     force row level security;
alter table public.workout_days      force row level security;
alter table public.workout_exercises force row level security;
alter table public.workout_logs      force row level security;
alter table public.exercise_logs     force row level security;

-- ---------------------------------------------------------------------------
-- exercises: world-readable, service-role writable
-- ---------------------------------------------------------------------------
drop policy if exists exercises_select_all on public.exercises;
create policy exercises_select_all
  on public.exercises
  for select
  to anon, authenticated
  using (true);

drop policy if exists exercises_admin_all on public.exercises;
create policy exercises_admin_all
  on public.exercises
  for all
  to service_role
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- profiles: a row belongs to exactly the user it is keyed by
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- `with check` prevents a user from inserting a row under someone else's id.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Deletion is intentionally not granted to clients. Account removal is done
-- through the auth provider, which cascades to this table.

-- ---------------------------------------------------------------------------
-- workout_plans
-- ---------------------------------------------------------------------------
drop policy if exists workout_plans_select_own on public.workout_plans;
create policy workout_plans_select_own
  on public.workout_plans
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists workout_plans_insert_own on public.workout_plans;
create policy workout_plans_insert_own
  on public.workout_plans
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_plans_update_own on public.workout_plans;
create policy workout_plans_update_own
  on public.workout_plans
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_plans_delete_own on public.workout_plans;
create policy workout_plans_delete_own
  on public.workout_plans
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- workout_days: ownership resolved through the parent plan
-- ---------------------------------------------------------------------------
drop policy if exists workout_days_select_own on public.workout_days;
create policy workout_days_select_own
  on public.workout_days
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_plans p
      where p.id = workout_days.workout_plan_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_days_insert_own on public.workout_days;
create policy workout_days_insert_own
  on public.workout_days
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_plans p
      where p.id = workout_days.workout_plan_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_days_update_own on public.workout_days;
create policy workout_days_update_own
  on public.workout_days
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_plans p
      where p.id = workout_days.workout_plan_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_plans p
      where p.id = workout_days.workout_plan_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_days_delete_own on public.workout_days;
create policy workout_days_delete_own
  on public.workout_days
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_plans p
      where p.id = workout_days.workout_plan_id
        and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- workout_exercises: ownership resolved through day, then plan
-- ---------------------------------------------------------------------------
drop policy if exists workout_exercises_select_own on public.workout_exercises;
create policy workout_exercises_select_own
  on public.workout_exercises
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_days d
      join public.workout_plans p on p.id = d.workout_plan_id
      where d.id = workout_exercises.workout_day_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_exercises_insert_own on public.workout_exercises;
create policy workout_exercises_insert_own
  on public.workout_exercises
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_days d
      join public.workout_plans p on p.id = d.workout_plan_id
      where d.id = workout_exercises.workout_day_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_exercises_update_own on public.workout_exercises;
create policy workout_exercises_update_own
  on public.workout_exercises
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_days d
      join public.workout_plans p on p.id = d.workout_plan_id
      where d.id = workout_exercises.workout_day_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_days d
      join public.workout_plans p on p.id = d.workout_plan_id
      where d.id = workout_exercises.workout_day_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists workout_exercises_delete_own on public.workout_exercises;
create policy workout_exercises_delete_own
  on public.workout_exercises
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_days d
      join public.workout_plans p on p.id = d.workout_plan_id
      where d.id = workout_exercises.workout_day_id
        and p.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- workout_logs
-- ---------------------------------------------------------------------------
drop policy if exists workout_logs_select_own on public.workout_logs;
create policy workout_logs_select_own
  on public.workout_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists workout_logs_insert_own on public.workout_logs;
create policy workout_logs_insert_own
  on public.workout_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_logs_update_own on public.workout_logs;
create policy workout_logs_update_own
  on public.workout_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_logs_delete_own on public.workout_logs;
create policy workout_logs_delete_own
  on public.workout_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- exercise_logs: ownership resolved through the parent log
-- ---------------------------------------------------------------------------
drop policy if exists exercise_logs_select_own on public.exercise_logs;
create policy exercise_logs_select_own
  on public.exercise_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workout_logs l
      where l.id = exercise_logs.workout_log_id
        and l.user_id = (select auth.uid())
    )
  );

drop policy if exists exercise_logs_insert_own on public.exercise_logs;
create policy exercise_logs_insert_own
  on public.exercise_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.workout_logs l
      where l.id = exercise_logs.workout_log_id
        and l.user_id = (select auth.uid())
    )
  );

drop policy if exists exercise_logs_update_own on public.exercise_logs;
create policy exercise_logs_update_own
  on public.exercise_logs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.workout_logs l
      where l.id = exercise_logs.workout_log_id
        and l.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_logs l
      where l.id = exercise_logs.workout_log_id
        and l.user_id = (select auth.uid())
    )
  );

drop policy if exists exercise_logs_delete_own on public.exercise_logs;
create policy exercise_logs_delete_own
  on public.exercise_logs
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.workout_logs l
      where l.id = exercise_logs.workout_log_id
        and l.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Grants
--
-- The anon/authenticated roles get no implicit access; RLS plus explicit grants
-- together define what is reachable. The service role bypasses RLS and is used
-- only by the seed script.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.exercises to anon, authenticated;
grant all on public.exercises to service_role;

grant select, insert, update, delete on public.profiles          to authenticated;
grant select, insert, update, delete on public.workout_plans     to authenticated;
grant select, insert, update, delete on public.workout_days      to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_logs      to authenticated;
grant select, insert, update, delete on public.exercise_logs     to authenticated;

grant all on all tables in schema public to service_role;

-- Anonymous visitors get nothing in the app: there are no public tables
-- beyond the read-only catalog.
revoke all on public.profiles          from anon;
revoke all on public.workout_plans     from anon;
revoke all on public.workout_days      from anon;
revoke all on public.workout_exercises from anon;
revoke all on public.workout_logs      from anon;
revoke all on public.exercise_logs     from anon;

commit;
