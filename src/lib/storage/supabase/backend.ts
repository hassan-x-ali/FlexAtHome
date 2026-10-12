/**
 * SupabaseBackend — the optional cloud backend.
 *
 * Implements the same `StorageAdapter` interface as the local backend, mapped
 * one-to-one onto the tables in `supabase/migrations`. Only constructed when
 * the public Supabase env vars are present.
 *
 * Authorization: every user-scoped query filters by `auth.uid()`, and every
 * mutation goes through RLS, which independently verifies ownership using
 * JWT claims rather than anything passed by the client. The filters here are
 * for clarity and query planning; RLS is the enforcement boundary.
 */
import { browserClientOrNull, isSupabaseConfigured } from '@/lib/storage/supabase/client';
import { newId, nowIso } from '@/lib/domain/ids';
import { seedRelationsFor } from '@/lib/domain/exercise-relations';
import type {
  DayIndex,
  Exercise,
  ExerciseLog,
  OnboardingAnswers,
  Profile,
  WorkoutDay,
  WorkoutDayWithExercises,
  WorkoutExercise,
  WorkoutLog,
  WorkoutLogWithExercises,
  WorkoutPlan,
  WorkoutPlanWithDays,
} from '@/lib/domain/types';
import {
  emailSchema,
  exerciseLogInputSchema,
  passwordSchema,
  onboardingSchema,
  type PlanDraftInput,
  planDraftSchema,
  profileUpdateSchema,
  workoutLogCompleteSchema,
  workoutLogStartSchema,
} from '@/lib/domain/validation';
import {
  StorageError,
  type AuthAdapter,
  type AuthUser,
  type EmailSignup,
  type ExerciseQuery,
  type SignupCaptureAdapter,
  type StorageAdapter,
} from '@/lib/storage/types';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Maps a Supabase auth error into a message a person can act on. */
const authError = (error: { message: string } | null): StorageError => {
  const message = error?.message ?? 'Unknown error';
  if (/already registered|already exists/i.test(message)) {
    return new StorageError('conflict', 'That email is already registered. Try signing in.');
  }
  if (/invalid login credentials/i.test(message)) {
    return new StorageError('validation_failed', 'That email and password do not match.');
  }
  if (/email not confirmed/i.test(message)) {
    return new StorageError('validation_failed', 'Confirm your email address before signing in.');
  }
  if (/rate limit|too many/i.test(message)) {
    return new StorageError('unavailable', 'Too many attempts. Wait a minute and try again.');
  }
  return new StorageError('validation_failed', message);
};

const toAuthUser = (user: User | null): AuthUser | null =>
  user ? { id: user.id, email: user.email ?? '', emailVerified: user.email_confirmed_at != null } : null;

// --- Auth ------------------------------------------------------------------

const supabaseAuth: AuthAdapter = {
  async getUser() {
    const client = browserClientOrNull();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return toAuthUser(data.user);
  },

  onAuthStateChange(callback) {
    const client = browserClientOrNull();
    if (!client) return () => undefined;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      callback(toAuthUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  },

  async signUp(credentials) {
    const client = browserClientOrNull();
    if (!client) return { error: authError(null) };
    const email = emailSchema.safeParse(credentials.email);
    if (!email.success) {
      return { error: new StorageError('validation_failed', 'Enter a valid email address.') };
    }
    const { data, error } = await client.auth.signUp({
      email: email.data,
      password: credentials.password,
    });
    if (error) return { error: authError(error) };
    if (!data.user) {
      return { error: new StorageError('validation_failed', 'Sign-up did not return a user.') };
    }
    return {
      user: toAuthUser(data.user)!,
      needsEmailConfirmation: data.session === null,
    };
  },

  async signIn(credentials) {
    const client = browserClientOrNull();
    if (!client) return { error: authError(null) };
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) return { error: authError(error) };
    if (!data.user) {
      return { error: new StorageError('validation_failed', 'Sign-in did not return a user.') };
    }
    return { user: toAuthUser(data.user)! };
  },

  async signOut() {
    const client = browserClientOrNull();
    if (!client) return { error: null };
    const { error } = await client.auth.signOut();
    return { error: error ? authError(error) : null };
  },

  async requestPasswordReset(email) {
    const client = browserClientOrNull();
    if (!client) return { error: authError(null) };
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      return { error: new StorageError('validation_failed', 'Enter a valid email address.') };
    }
    const { error } = await client.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/profile`,
    });
    return { error: error ? authError(error) : null };
  },

  async updatePassword(password) {
    const client = browserClientOrNull();
    if (!client) return { error: authError(null) };
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message;
      return {
        error: new StorageError('validation_failed', first ?? 'Choose a stronger password.'),
      };
    }
    const { error } = await client.auth.updateUser({ password: parsed.data });
    return { error: error ? authError(error) : null };
  },

  async signInWithGoogle() {
    const client = browserClientOrNull();
    if (!client) return { error: authError(null) };
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    if (error) return { error: authError(error) };
    return { user: toAuthUser((await client.auth.getUser()).data.user)! };
  },
};

/** Fails loudly if no session, since every user-scoped call needs one. */
const requireUid = async (client: SupabaseClient): Promise<string> => {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new StorageError('unauthenticated', 'Sign in to continue.');
  }
  return data.user.id;
};

// --- Row mapping -----------------------------------------------------------

/** Supabase returns `jsonb` columns as JS values and `timestamptz` as strings. */
type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const mapProfile = (r: Row): Profile => ({
  id: str(r.id),
  fullName: str(r.full_name),
  ageRange: str(r.age_range, '25_34') as Profile['ageRange'],
  gender: (typeof r.gender === 'string' ? r.gender : null) as Profile['gender'],
  fitnessLevel: str(r.fitness_level, 'beginner') as Profile['fitnessLevel'],
  primaryGoal: str(r.primary_goal, 'general_fitness') as Profile['primaryGoal'],
  workoutDaysPerWeek: num(r.workout_days_per_week, 3),
  preferredDuration: num(r.preferred_duration, 20),
  preferredIntensity: str(r.preferred_intensity, 'balanced') as Profile['preferredIntensity'],
  movementsToAvoid: strArray(r.movements_to_avoid),
  onboardingCompletedAt: typeof r.onboarding_completed_at === 'string' ? r.onboarding_completed_at : null,
  createdAt: str(r.created_at, nowIso()),
  updatedAt: str(r.updated_at, nowIso()),
});

const mapExercise = (r: Row): Exercise => ({
  id: str(r.id),
  name: str(r.name),
  slug: str(r.slug),
  description: str(r.description),
  bodyParts: strArray(r.body_parts) as Exercise['bodyParts'],
  primaryMuscles: strArray(r.primary_muscles) as Exercise['primaryMuscles'],
  secondaryMuscles: strArray(r.secondary_muscles) as Exercise['secondaryMuscles'],
  difficulty: str(r.difficulty, 'beginner') as Exercise['difficulty'],
  exerciseType: str(r.exercise_type, 'other') as Exercise['exerciseType'],
  equipmentRequired: 'none',
  instructions: strArray(r.instructions),
  formCues: strArray(r.form_cues),
  commonMistakes: strArray(r.common_mistakes),
  breathingInstruction: str(r.breathing_instruction),
  recommendedSets: numOrNull(r.recommended_sets),
  recommendedReps: numOrNull(r.recommended_reps),
  recommendedDurationSeconds: numOrNull(r.recommended_duration),
  recommendedRestSeconds: num(r.recommended_rest, 60),
  safetyNotes: str(r.safety_notes),
  // Reference relations live only in the bundled seed, not in a column. Resolving
  // them from the local graph keeps the cloud payload identical to the local one
  // instead of storing a second copy that could drift.
  progressionExercises: seedRelationsFor(str(r.slug)).progression,
  regressionExercises: seedRelationsFor(str(r.slug)).regression,
  alternativeExercises: seedRelationsFor(str(r.slug)).alternative,
  createdAt: str(r.created_at, nowIso()),
});

const mapPlan = (r: Row): WorkoutPlan => ({
  id: str(r.id),
  userId: str(r.user_id),
  name: str(r.name),
  description: str(r.description),
  isActive: bool(r.is_active),
  createdAt: str(r.created_at, nowIso()),
  updatedAt: str(r.updated_at, nowIso()),
});

const mapDay = (r: Row): WorkoutDay => ({
  id: str(r.id),
  workoutPlanId: str(r.workout_plan_id),
  dayOfWeek: num(r.day_of_week, 0) as DayIndex,
  name: str(r.name),
  isRestDay: bool(r.is_rest_day),
  createdAt: str(r.created_at, nowIso()),
});

const mapWorkoutExercise = (r: Row): WorkoutExercise => ({
  id: str(r.id),
  workoutDayId: str(r.workout_day_id),
  exerciseId: str(r.exercise_id),
  orderIndex: num(r.order_index, 0),
  sets: numOrNull(r.sets),
  reps: numOrNull(r.reps),
  durationSeconds: numOrNull(r.duration_seconds),
  restSeconds: num(r.rest_seconds, 60),
  notes: str(r.notes),
  createdAt: str(r.created_at, nowIso()),
});

const mapWorkoutLog = (r: Row): WorkoutLog => ({
  id: str(r.id),
  userId: str(r.user_id),
  workoutPlanId: typeof r.workout_plan_id === 'string' ? r.workout_plan_id : null,
  workoutDayId: typeof r.workout_day_id === 'string' ? r.workout_day_id : null,
  startedAt: str(r.started_at, nowIso()),
  completedAt: typeof r.completed_at === 'string' ? r.completed_at : null,
  durationSeconds: num(r.duration_seconds, 0),
  notes: str(r.notes),
  createdAt: str(r.created_at, nowIso()),
});

const mapExerciseLog = (r: Row): ExerciseLog => ({
  id: str(r.id),
  workoutLogId: str(r.workout_log_id),
  exerciseId: str(r.exercise_id),
  setsCompleted: num(r.sets_completed, 0),
  repsCompleted: num(r.reps_completed, 0),
  durationSeconds: num(r.duration_seconds, 0),
  notes: str(r.notes),
  createdAt: str(r.created_at, nowIso()),
});

// --- Adapter ---------------------------------------------------------------

export const createSupabaseBackend = (): StorageAdapter | null => {
  if (!isSupabaseConfigured()) return null;
  const client = browserClientOrNull();
  if (!client) return null;

  const profiles = {
    async get(): Promise<Profile | null> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      return data ? mapProfile(data as Row) : null;
    },

    async save(answers: OnboardingAnswers): Promise<Profile> {
      const uid = await requireUid(client);
      const parsed = onboardingSchema.parse(answers);
      const { data, error } = await client
        .from('profiles')
        .upsert({
          id: uid,
          full_name: parsed.fullName,
          age_range: parsed.ageRange,
          gender: parsed.gender,
          fitness_level: parsed.fitnessLevel,
          primary_goal: parsed.primaryGoal,
          workout_days_per_week: parsed.workoutDaysPerWeek,
          preferred_duration: parsed.preferredDuration,
          preferred_intensity: parsed.preferredIntensity,
          movements_to_avoid: parsed.movementsToAvoid,
          updated_at: nowIso(),
        })
        .select()
        .single();
      if (error) throw new StorageError('unavailable', error.message);
      return mapProfile(data as Row);
    },

    async update(changes: Partial<Profile>): Promise<Profile> {
      const uid = await requireUid(client);
      const parsed = profileUpdateSchema.parse(changes);
      const patch: Record<string, unknown> = { updated_at: nowIso() };
      if (parsed.fullName !== undefined) patch.full_name = parsed.fullName;
      if (parsed.ageRange !== undefined) patch.age_range = parsed.ageRange;
      if (parsed.gender !== undefined) patch.gender = parsed.gender;
      if (parsed.fitnessLevel !== undefined) patch.fitness_level = parsed.fitnessLevel;
      if (parsed.primaryGoal !== undefined) patch.primary_goal = parsed.primaryGoal;
      if (parsed.workoutDaysPerWeek !== undefined)
        patch.workout_days_per_week = parsed.workoutDaysPerWeek;
      if (parsed.preferredDuration !== undefined) patch.preferred_duration = parsed.preferredDuration;
      if (parsed.preferredIntensity !== undefined)
        patch.preferred_intensity = parsed.preferredIntensity;
      if (parsed.movementsToAvoid !== undefined) patch.movements_to_avoid = parsed.movementsToAvoid;

      const { data, error } = await client
        .from('profiles')
        .update(patch)
        .eq('id', uid)
        .select()
        .single();
      if (error) throw new StorageError('unavailable', error.message);
      return mapProfile(data as Row);
    },

    async completeOnboarding(): Promise<Profile> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('profiles')
        .update({ onboarding_completed_at: nowIso(), updated_at: nowIso() })
        .eq('id', uid)
        .is('onboarding_completed_at', null)
        .select()
        .maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      if (data) return mapProfile(data as Row);
      // Already completed: read it back.
      const { data: existing } = await client.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (!existing) throw new StorageError('not_found', 'No profile found.');
      return mapProfile(existing as Row);
    },
  };

  /**
   * PostgREST `or` clauses for the filters that cannot be expressed as a simple
   * column predicate. Returns one clause per constraint, or null when there is
   * nothing to add, so the caller can apply it with a single `.or()`.
   */
  const orClause = (query: ExerciseQuery): string | null => {
    const clauses: string[] = [];
    const search = query.search?.trim();
    if (search) {
      const term = `%${search}%`;
      // Muscle arrays are `text[]`, which PostgREST cannot apply `ilike` to, so
      // muscle text is matched in `postFilter` instead.
      clauses.push(`name.ilike.${term}`, `description.ilike.${term}`);
    }
    if (query.durationBuckets?.length) {
      const buckets = query.durationBuckets;
      // Rep-based movements have no duration and must not match any bucket, so
      // every clause requires a non-null duration.
      if (buckets.includes('quick')) clauses.push('recommended_duration.lte.20');
      if (buckets.includes('standard')) {
        clauses.push('and(recommended_duration.gt.20,recommended_duration.lte.45)');
      }
      if (buckets.includes('long')) clauses.push('recommended_duration.gt.45');
    }
    return clauses.length > 0 ? clauses.join(',') : null;
  };

  /**
   * Column-backed filters, shared by `list` and `count` so the two cannot drift.
   */
  const applyColumnFilters = (query: ExerciseQuery) => {
    let q = client.from('exercises').select('*');
    if (query.bodyParts?.length) q = q.contains('body_parts', query.bodyParts as string[]);
    if (query.muscles?.length) q = q.contains('primary_muscles', query.muscles as string[]);
    if (query.difficulty?.length) q = q.in('difficulty', query.difficulty as string[]);
    if (query.types?.length) q = q.in('exercise_type', query.types as string[]);
    const clause = orClause(query);
    if (clause) q = q.or(clause);
    return q;
  };

  /** Muscle-array text match, mirroring the local backend's search fields. */
  const postFilter = (rows: Exercise[], query: ExerciseQuery): Exercise[] => {
    const search = query.search?.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((e) =>
      [...e.primaryMuscles, ...e.secondaryMuscles, ...e.bodyParts].some((m) =>
        m.toLowerCase().includes(search),
      ),
    );
  };

  const exercises = {
    async list(query: ExerciseQuery = {}): Promise<Exercise[]> {
      const { data, error } = await applyColumnFilters(query).order('name');
      if (error) throw new StorageError('unavailable', error.message);
      const rows = postFilter(((data ?? []) as Row[]).map(mapExercise), query);
      const offset = query.offset ?? 0;
      return typeof query.limit === 'number' ? rows.slice(offset, offset + query.limit) : rows.slice(offset);
    },
    async getById(id: string): Promise<Exercise | null> {
      const { data, error } = await client.from('exercises').select('*').eq('id', id).maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      return data ? mapExercise(data as Row) : null;
    },
    async getBySlug(slug: string): Promise<Exercise | null> {
      const { data, error } = await client.from('exercises').select('*').eq('slug', slug).maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      return data ? mapExercise(data as Row) : null;
    },
    async count(query: ExerciseQuery = {}): Promise<number> {
      // A post-filter means the row count has to come from the filtered set,
      // so `head: true` would report a number the user never sees.
      const { data, error } = await applyColumnFilters(query);
      if (error) throw new StorageError('unavailable', error.message);
      return postFilter(((data ?? []) as Row[]).map(mapExercise), query).length;
    },
  };

  const loadDayGraph = async (planId: string): Promise<WorkoutDayWithExercises[]> => {
    const { data: dayRows, error: dayError } = await client
      .from('workout_days')
      .select('*')
      .eq('workout_plan_id', planId)
      .order('day_of_week');
    if (dayError) throw new StorageError('unavailable', dayError.message);
    const days = ((dayRows ?? []) as Row[]).map(mapDay);
    if (days.length === 0) return [];

    const { data: exRows, error: exError } = await client
      .from('workout_exercises')
      .select('*')
      .in('workout_day_id', days.map((d) => d.id))
      .order('order_index');
    if (exError) throw new StorageError('unavailable', exError.message);
    const allExercises = ((exRows ?? []) as Row[]).map(mapWorkoutExercise);

    const catalog = new Map((await exercises.list()).map((e) => [e.id, e]));

    return days.map((day) => ({
      ...day,
      exercises: allExercises
        .filter((e) => e.workoutDayId === day.id)
        .map((e) => {
          const exercise = catalog.get(e.exerciseId);
          return exercise ? { ...e, exercise } : null;
        })
        .filter((v): v is WorkoutExercise & { exercise: Exercise } => v !== null),
    }));
  };

  const plans = {
    async getActive(): Promise<WorkoutPlanWithDays | null> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('workout_plans')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      if (!data) return null;
      const plan = mapPlan(data as Row);
      return { ...plan, days: await loadDayGraph(plan.id) };
    },
    async getById(id: string): Promise<WorkoutPlanWithDays | null> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('workout_plans')
        .select('*')
        .eq('id', id)
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      if (!data) return null;
      const plan = mapPlan(data as Row);
      return { ...plan, days: await loadDayGraph(plan.id) };
    },
    async list(): Promise<WorkoutPlan[]> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('workout_plans')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false });
      if (error) throw new StorageError('unavailable', error.message);
      return ((data ?? []) as Row[]).map(mapPlan);
    },
    async save(draft: PlanDraftInput): Promise<WorkoutPlanWithDays> {
      const uid = await requireUid(client);
      const parsed = planDraftSchema.parse(draft);

      // Replace the whole graph: deactivate others, upsert the plan, replace days.
      const { data: planRow, error: planError } = await client
        .from('workout_plans')
        .upsert(
          {
            ...(parsed.id ? { id: parsed.id } : {}),
            user_id: uid,
            name: parsed.name,
            description: parsed.description,
            is_active: true,
            updated_at: nowIso(),
          },
          { onConflict: 'id' },
        )
        .select()
        .single();
      if (planError) throw new StorageError('unavailable', planError.message);
      const planId = str((planRow as Row).id);

      await client
        .from('workout_plans')
        .update({ is_active: false })
        .eq('user_id', uid)
        .neq('id', planId);

      const { data: oldDayRows } = await client
        .from('workout_days')
        .select('id')
        .eq('workout_plan_id', planId);
      const oldDayIds = ((oldDayRows ?? []) as Row[]).map((r) => str(r.id));
      if (oldDayIds.length > 0) {
        await client.from('workout_exercises').delete().in('workout_day_id', oldDayIds);
        await client.from('workout_days').delete().in('id', oldDayIds);
      }

      const { data: dayRows, error: dayError } = await client
        .from('workout_days')
        .insert(
          parsed.days.map((d) => ({
            workout_plan_id: planId,
            day_of_week: d.dayOfWeek,
            name: d.name,
            is_rest_day: d.isRestDay,
          })),
        )
        .select();
      if (dayError) throw new StorageError('unavailable', dayError.message);
      const createdDays = ((dayRows ?? []) as Row[]).map(mapDay);

      const exercisePayload = parsed.days.flatMap((d) => {
        const day = createdDays.find((c) => c.dayOfWeek === d.dayOfWeek);
        if (!day) return [];
        return d.exercises.map((e) => ({
          workout_day_id: day.id,
          exercise_id: e.exerciseId,
          order_index: e.orderIndex,
          sets: e.sets,
          reps: e.reps,
          duration_seconds: e.durationSeconds,
          rest_seconds: e.restSeconds,
          notes: e.notes,
        }));
      });
      if (exercisePayload.length > 0) {
        const { error: exError } = await client
          .from('workout_exercises')
          .insert(exercisePayload);
        if (exError) throw new StorageError('unavailable', exError.message);
      }

      return { ...mapPlan(planRow as Row), days: await loadDayGraph(planId) };
    },
    async remove(id: string): Promise<void> {
      const uid = await requireUid(client);
      const { data: dayRows } = await client
        .from('workout_days')
        .select('id')
        .eq('workout_plan_id', id);
      const dayIds = ((dayRows ?? []) as Row[]).map((r) => str(r.id));
      if (dayIds.length > 0) {
        await client.from('workout_exercises').delete().in('workout_day_id', dayIds);
        await client.from('workout_days').delete().in('id', dayIds);
      }
      const { error } = await client
        .from('workout_plans')
        .delete()
        .eq('id', id)
        .eq('user_id', uid);
      if (error) throw new StorageError('unavailable', error.message);
    },
    async getDayWithExercises(id: string): Promise<WorkoutDayWithExercises | null> {
      const { data, error } = await client.from('workout_days').select('*').eq('id', id).maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      if (!data) return null;
      const day = mapDay(data as Row);
      const days = await loadDayGraph(day.workoutPlanId);
      return days.find((d) => d.id === id) ?? null;
    },
  };

  const logs = {
    async start(input: unknown): Promise<WorkoutLog> {
      const uid = await requireUid(client);
      const parsed = workoutLogStartSchema.parse(input);
      const { data, error } = await client
        .from('workout_logs')
        .insert({
          user_id: uid,
          workout_plan_id: parsed.workoutPlanId,
          workout_day_id: parsed.workoutDayId,
          started_at: parsed.startedAt,
          duration_seconds: 0,
        })
        .select()
        .single();
      if (error) throw new StorageError('unavailable', error.message);
      return mapWorkoutLog(data as Row);
    },
    async complete(id: string, input: unknown): Promise<WorkoutLog> {
      const uid = await requireUid(client);
      const parsed = workoutLogCompleteSchema.parse(input);
      const { data, error } = await client
        .from('workout_logs')
        .update({
          completed_at: parsed.completedAt,
          duration_seconds: parsed.durationSeconds,
          notes: parsed.notes,
        })
        .eq('id', id)
        .eq('user_id', uid)
        .select()
        .single();
      if (error) throw new StorageError('unavailable', error.message);
      return mapWorkoutLog(data as Row);
    },
    async abandon(id: string): Promise<void> {
      const uid = await requireUid(client);
      const { data: entries } = await client
        .from('exercise_logs')
        .select('id')
        .eq('workout_log_id', id);
      const entryIds = ((entries ?? []) as Row[]).map((r) => str(r.id));
      if (entryIds.length > 0) await client.from('exercise_logs').delete().in('id', entryIds);
      const { error } = await client.from('workout_logs').delete().eq('id', id).eq('user_id', uid);
      if (error) throw new StorageError('unavailable', error.message);
    },
    async logExercise(input: unknown, workoutLogId: string): Promise<ExerciseLog> {
      const parsed = exerciseLogInputSchema.parse(input);
      const { data, error } = await client
        .from('exercise_logs')
        .insert({
          workout_log_id: workoutLogId,
          exercise_id: parsed.exerciseId,
          sets_completed: parsed.setsCompleted,
          reps_completed: parsed.repsCompleted,
          duration_seconds: parsed.durationSeconds,
          notes: parsed.notes,
        })
        .select()
        .single();
      if (error) throw new StorageError('unavailable', error.message);
      return mapExerciseLog(data as Row);
    },
    async getById(id: string): Promise<WorkoutLogWithExercises | null> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('workout_logs')
        .select('*')
        .eq('id', id)
        .eq('user_id', uid)
        .maybeSingle();
      if (error) throw new StorageError('unavailable', error.message);
      if (!data) return null;
      const log = mapWorkoutLog(data as Row);

      const { data: entryRows } = await client
        .from('exercise_logs')
        .select('*')
        .eq('workout_log_id', id)
        .order('created_at');
      const entries = ((entryRows ?? []) as Row[]).map(mapExerciseLog);
      const catalog = new Map((await exercises.list()).map((e) => [e.id, e]));

      return {
        ...log,
        exercises: entries
          .map((e) => {
            const exercise = catalog.get(e.exerciseId);
            return exercise ? { ...e, exercise } : null;
          })
          .filter((v): v is ExerciseLog & { exercise: Exercise } => v !== null),
      };
    },
    async listRecent(limit = 10): Promise<WorkoutLog[]> {
      const uid = await requireUid(client);
      const { data, error } = await client
        .from('workout_logs')
        .select('*')
        .eq('user_id', uid)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw new StorageError('unavailable', error.message);
      return ((data ?? []) as Row[]).map(mapWorkoutLog);
    },
  };

  // Landing-page signups stay local by design: they are not user accounts and
  // there is no consent basis for pushing marketing addresses to the cloud.
  const localSignups: SignupCaptureAdapter = {
    async capture(email: string) {
      const parsed = emailSchema.parse(email);
      const key = 'flexat:v1:signups';
      const existing = (() => {
        try {
          const raw = window.localStorage.getItem(key);
          return raw ? (JSON.parse(raw) as { version: number; rows: EmailSignup[] }) : { version: 1, rows: [] };
        } catch {
          return { version: 1, rows: [] as EmailSignup[] };
        }
      })();
      const found = existing.rows.find((s) => s.email === parsed);
      if (found) return found;
      const signup: EmailSignup = { id: newId(), email: parsed, createdAt: nowIso() };
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, rows: [...existing.rows, signup] }),
        );
      } catch {
        // A full or blocked store must not break the page. The signup is
        // still acknowledged because the form's purpose is the confirmation.
      }
      return signup;
    },
    async list() {
      try {
        const raw = window.localStorage.getItem('flexat:v1:signups');
        return raw ? (JSON.parse(raw) as { rows: EmailSignup[] }).rows : [];
      } catch {
        return [];
      }
    },
  };

  return {
    kind: 'supabase',
    cloudConfigured: true,
    auth: supabaseAuth,
    profiles,
    exercises,
    plans,
    logs,
    signups: localSignups,
  };
};
