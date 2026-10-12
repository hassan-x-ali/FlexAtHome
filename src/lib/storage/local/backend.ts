/**
 * LocalBackend — the zero-configuration default.
 *
 * Works immediately with no environment variables. The synthetic local user is
 * always signed in, so every feature in the app is reachable without an
 * account. Data lives in localStorage under a versioned namespace.
 */
import { LOCAL_USER_ID, newId, nowIso } from '@/lib/domain/ids';
import { SEED_EXERCISES } from '@/lib/domain/exercise-seed';
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
  onboardingSchema,
  type PlanDraftInput,
  planDraftSchema,
  profileUpdateSchema,
  workoutLogCompleteSchema,
  workoutLogStartSchema,
} from '@/lib/domain/validation';
import { clearAll, select, transact } from '@/lib/storage/local/db';
import {
  durationBucketOf,
  StorageError,
  type AuthAdapter,
  type AuthUser,
  type EmailSignup,
  type ExerciseQuery,
  type SignupCaptureAdapter,
  type StorageAdapter,
} from '@/lib/storage/types';

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/** Wraps a Zod failure as a `StorageError` so adapters report one error type. */
const fail = (error: unknown): never => {
  if (error instanceof StorageError) throw error;
  if (error && typeof error === 'object' && 'issues' in error) {
    const issues = (error as { issues: { message?: string }[] }).issues;
    const first = issues[0]?.message;
    throw new StorageError('validation_failed', first ? `Invalid input: ${first}` : 'Invalid input');
  }
  throw new StorageError('validation_failed', 'Invalid input');
};

const matchesText = (haystack: readonly string[], needle: string): boolean =>
  haystack.some((v) => v.toLowerCase().includes(needle));

// --- Catalog ---------------------------------------------------------------

const localExercises: Exercise[] = SEED_EXERCISES;

const filterExercises = (query: ExerciseQuery = {}): Exercise[] => {
  const search = query.search?.trim().toLowerCase();
  const muscleSet = query.muscles ? new Set(query.muscles) : null;
  const bodySet = query.bodyParts ? new Set(query.bodyParts) : null;
  const difficultySet = query.difficulty ? new Set<string>(query.difficulty) : null;
  const typeSet = query.types ? new Set(query.types) : null;
  const durationSet = query.durationBuckets ? new Set<string>(query.durationBuckets) : null;

  const result = localExercises.filter((e) => {
    if (search) {
      const haystack: string[] = [
        e.name,
        e.description,
        ...e.bodyParts,
        ...e.primaryMuscles,
        ...e.secondaryMuscles,
      ];
      if (!matchesText(haystack, search)) return false;
    }
    if (muscleSet && !e.primaryMuscles.some((m) => muscleSet.has(m))) return false;
    if (bodySet && !e.bodyParts.some((b) => bodySet.has(b))) return false;
    if (difficultySet && !difficultySet.has(e.difficulty)) return false;
    if (typeSet && !typeSet.has(e.exerciseType)) return false;
    if (durationSet) {
      // A rep-based movement has no duration, so it fails every bucket.
      const bucket = durationBucketOf(e);
      if (bucket === null || !durationSet.has(bucket)) return false;
    }
    return true;
  });

  // Stable, predictable ordering: alphabetical by name.
  result.sort((a, b) => a.name.localeCompare(b.name));

  const offset = query.offset ?? 0;
  const limit = query.limit;
  return typeof limit === 'number' ? result.slice(offset, offset + limit) : result.slice(offset);
};

const exercisesAdapter = {
  async list(query?: ExerciseQuery): Promise<Exercise[]> {
    return filterExercises(query);
  },
  async getById(id: string): Promise<Exercise | null> {
    return localExercises.find((e) => e.id === id) ?? null;
  },
  async getBySlug(slug: string): Promise<Exercise | null> {
    return localExercises.find((e) => e.slug === slug) ?? null;
  },
  async count(query?: ExerciseQuery): Promise<number> {
    return filterExercises(query).length;
  },
};

// --- Auth ------------------------------------------------------------------

const LOCAL_USER: AuthUser = {
  id: LOCAL_USER_ID,
  email: '',
  emailVerified: null,
};

const localAuth: AuthAdapter = {
  async getUser(): Promise<AuthUser | null> {
    return isBrowser() ? LOCAL_USER : null;
  },
  onAuthStateChange(callback): () => void {
    // No session to change in local mode, but notify once so consumers that
    // subscribe on mount receive a consistent initial value.
    if (isBrowser()) queueMicrotask(() => callback(LOCAL_USER));
    return () => undefined;
  },
  async signUp(): Promise<never> {
    throw new StorageError(
      'unavailable',
      'Cloud accounts are not enabled. Your data is already saved on this device.',
    );
  },
  async signIn(): Promise<never> {
    throw new StorageError(
      'unavailable',
      'Cloud accounts are not enabled. Your data is already saved on this device.',
    );
  },
  async signOut(): Promise<{ error: StorageError | null }> {
    // Local mode has no session. Signing out would strand the user with no
    // account, so this is a no-op success.
    return { error: null };
  },
  async requestPasswordReset(): Promise<{ error: StorageError | null }> {
    return {
      error: new StorageError(
        'unavailable',
        'Password reset needs a cloud account. Your data is already saved on this device.',
      ),
    };
  },
  async updatePassword(): Promise<{ error: StorageError | null }> {
    return {
      error: new StorageError(
        'unavailable',
        'Password changes need a cloud account. Your data is already saved on this device.',
      ),
    };
  },

  async signInWithGoogle() {
    return {
      error: new StorageError(
        'unavailable',
        'Google sign-in needs a cloud account. Your data is already saved on this device.',
      ),
    };
  },
};

// --- Profiles --------------------------------------------------------------

const requireUser = (): string => LOCAL_USER_ID;

const profilesAdapter = {
  async get(): Promise<Profile | null> {
    return select<Profile>('profiles').find((p) => p.id === requireUser()) ?? null;
  },

  async save(answers: OnboardingAnswers): Promise<Profile> {
    try {
      const parsed = onboardingSchema.parse(answers);
      return transact<Profile, Profile>('profiles', (rows) => {
        const existing = rows.find((p) => p.id === LOCAL_USER_ID);
        const timestamp = nowIso();
        const profile: Profile = {
          id: LOCAL_USER_ID,
          fullName: parsed.fullName,
          ageRange: parsed.ageRange,
          gender: parsed.gender,
          fitnessLevel: parsed.fitnessLevel,
          primaryGoal: parsed.primaryGoal,
          workoutDaysPerWeek: parsed.workoutDaysPerWeek,
          preferredDuration: parsed.preferredDuration,
          preferredIntensity: parsed.preferredIntensity,
          movementsToAvoid: [...parsed.movementsToAvoid],
          onboardingCompletedAt: existing?.onboardingCompletedAt ?? null,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        const next = rows.filter((p) => p.id !== LOCAL_USER_ID).concat(profile);
        return { rows: next, result: profile };
      }) as Profile;
    } catch (error) {
      return fail(error);
    }
  },

  async update(changes: Partial<Profile>): Promise<Profile> {
    try {
      const parsed = profileUpdateSchema.parse(changes);
      return transact<Profile, Profile>('profiles', (rows) => {
        const index = rows.findIndex((p) => p.id === LOCAL_USER_ID);
        const current = rows[index];
        if (!current) {
          throw new StorageError('not_found', 'No profile found. Finish onboarding first.');
        }
        const updated: Profile = { ...current, ...parsed, updatedAt: nowIso() };
        const next = [...rows];
        next[index] = updated;
        return { rows: next, result: updated };
      }) as Profile;
    } catch (error) {
      return fail(error);
    }
  },

  async completeOnboarding(): Promise<Profile> {
    return transact<Profile, Profile>('profiles', (rows) => {
      const index = rows.findIndex((p) => p.id === LOCAL_USER_ID);
      const current = rows[index];
      if (!current) {
        throw new StorageError('not_found', 'No profile found. Finish onboarding first.');
      }
      if (current.onboardingCompletedAt) return { rows, result: current };
      const updated: Profile = {
        ...current,
        onboardingCompletedAt: nowIso(),
        updatedAt: nowIso(),
      };
      const next = [...rows];
      next[index] = updated;
      return { rows: next, result: updated };
    }) as Profile;
  },
};

// --- Plans -----------------------------------------------------------------

type DayRow = WorkoutDay;
type ExerciseRow = WorkoutExercise;

const loadDayWithExercises = (dayId: string): WorkoutDayWithExercises | null => {
  const day = select<DayRow>('days').find((d) => d.id === dayId);
  if (!day) return null;
  const rows = select<ExerciseRow>('workoutExercises')
    .filter((e) => e.workoutDayId === dayId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const exercises = rows
    .map((row) => {
      const exercise = localExercises.find((e) => e.id === row.exerciseId);
      return exercise ? { ...row, exercise } : null;
    })
    .filter((v): v is WorkoutExercise & { exercise: Exercise } => v !== null);
  return { ...day, exercises };
};

const loadPlanWithDays = (planId: string): WorkoutPlanWithDays | null => {
  const plan = select<WorkoutPlan>('plans').find((p) => p.id === planId);
  if (!plan) return null;
  const days = select<DayRow>('days')
    .filter((d) => d.workoutPlanId === planId)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((d) => loadDayWithExercises(d.id))
    .filter((d): d is WorkoutDayWithExercises => d !== null);
  return { ...plan, days };
};

const plansAdapter = {
  async getActive(): Promise<WorkoutPlanWithDays | null> {
    const active = select<WorkoutPlan>('plans').find((p) => p.isActive);
    return active ? loadPlanWithDays(active.id) : null;
  },

  async getById(id: string): Promise<WorkoutPlanWithDays | null> {
    return loadPlanWithDays(id);
  },

  async list(): Promise<WorkoutPlan[]> {
    return [...select<WorkoutPlan>('plans')].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async save(draft: PlanDraftInput): Promise<WorkoutPlanWithDays> {
    try {
      const parsed = planDraftSchema.parse(draft);
      const planId = transact<WorkoutPlan, string>('plans', (rows) => {
        const timestamp = nowIso();
        const id = parsed.id ?? newId();
        // Only one plan may be active at a time.
        const deactivated = rows.map((p) => ({ ...p, isActive: p.id === id }));
        const existing = rows.find((p) => p.id === id);
        const plan: WorkoutPlan = {
          id,
          userId: requireUser(),
          name: parsed.name,
          description: parsed.description,
          isActive: true,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
        };
        return {
          rows: deactivated.filter((p) => p.id !== id).concat(plan),
          result: id,
        };
      }) as string;

      // Rebuild the day graph from scratch so re-saving is idempotent.
      const oldDayIds = select<DayRow>('days')
        .filter((d) => d.workoutPlanId === planId)
        .map((d) => d.id);
      transact<DayRow, void>('days', (rows) => {
        const next = rows.filter((d) => !oldDayIds.includes(d.id));
        const created = parsed.days.map<DayRow>((d) => ({
          id: d.id ?? newId(),
          workoutPlanId: planId,
          dayOfWeek: d.dayOfWeek as DayIndex,
          name: d.name,
          isRestDay: d.isRestDay,
          createdAt: nowIso(),
        }));
        return { rows: next.concat(created), result: undefined };
      });
      transact<ExerciseRow, void>('workoutExercises', (rows) => {
        const next = rows.filter((e) => !oldDayIds.includes(e.workoutDayId));
        const created = parsed.days.flatMap<ExerciseRow>((d) => {
          const dayRow = select<DayRow>('days').find((x) => x.workoutPlanId === planId && x.dayOfWeek === d.dayOfWeek);
          if (!dayRow) return [];
          return d.exercises.map<ExerciseRow>((e) => ({
            id: e.id ?? newId(),
            workoutDayId: dayRow.id,
            exerciseId: e.exerciseId,
            orderIndex: e.orderIndex,
            sets: e.sets,
            reps: e.reps,
            durationSeconds: e.durationSeconds,
            restSeconds: e.restSeconds,
            notes: e.notes,
            createdAt: nowIso(),
          }));
        });
        return { rows: next.concat(created), result: undefined };
      });

      const saved = loadPlanWithDays(planId);
      if (!saved) throw new StorageError('unavailable', 'Could not save the plan.');
      return saved;
    } catch (error) {
      return fail(error);
    }
  },

  async remove(id: string): Promise<void> {
    transact<DayRow, void>('days', (rows) => {
      const doomed = rows.filter((d) => d.workoutPlanId === id).map((d) => d.id);
      transact<ExerciseRow, void>('workoutExercises', (exRows) => ({
        rows: exRows.filter((e) => !doomed.includes(e.workoutDayId)),
        result: undefined,
      }));
      return { rows: rows.filter((d) => d.workoutPlanId !== id), result: undefined };
    });
    transact<WorkoutPlan, void>('plans', (rows) => ({
      rows: rows.filter((p) => p.id !== id),
      result: undefined,
    }));
  },

  async getDayWithExercises(id: string): Promise<WorkoutDayWithExercises | null> {
    return loadDayWithExercises(id);
  },
};

// --- Logs ------------------------------------------------------------------

const loadLogWithExercises = (logId: string): WorkoutLogWithExercises | null => {
  const log = select<WorkoutLog>('workoutLogs').find((l) => l.id === logId);
  if (!log) return null;
  const rows = select<ExerciseLog>('exerciseLogs')
    .filter((l) => l.workoutLogId === logId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const exercises = rows
    .map((row) => {
      const exercise = localExercises.find((e) => e.id === row.exerciseId);
      return exercise ? { ...row, exercise } : null;
    })
    .filter((v): v is ExerciseLog & { exercise: Exercise } => v !== null);
  return { ...log, exercises };
};

const logsAdapter = {
  async start(input: unknown): Promise<WorkoutLog> {
    try {
      const parsed = workoutLogStartSchema.parse(input);
      return transact<WorkoutLog, WorkoutLog>('workoutLogs', (rows) => {
        const log: WorkoutLog = {
          id: newId(),
          userId: requireUser(),
          workoutPlanId: parsed.workoutPlanId,
          workoutDayId: parsed.workoutDayId,
          startedAt: parsed.startedAt,
          completedAt: null,
          durationSeconds: 0,
          notes: '',
          createdAt: nowIso(),
        };
        return { rows: rows.concat(log), result: log };
      }) as WorkoutLog;
    } catch (error) {
      return fail(error);
    }
  },

  async complete(id: string, input: unknown): Promise<WorkoutLog> {
    try {
      const parsed = workoutLogCompleteSchema.parse(input);
      return transact<WorkoutLog, WorkoutLog>('workoutLogs', (rows) => {
        const index = rows.findIndex((l) => l.id === id);
        if (index === -1) throw new StorageError('not_found', 'Workout log not found.');
        const updated: WorkoutLog = { ...rows[index]!, ...parsed };
        const next = [...rows];
        next[index] = updated;
        return { rows: next, result: updated };
      }) as WorkoutLog;
    } catch (error) {
      return fail(error);
    }
  },

  async abandon(id: string): Promise<void> {
    transact<ExerciseLog, void>('exerciseLogs', (rows) => ({
      rows: rows.filter((l) => l.workoutLogId !== id),
      result: undefined,
    }));
    transact<WorkoutLog, void>('workoutLogs', (rows) => ({
      rows: rows.filter((l) => l.id !== id),
      result: undefined,
    }));
  },

  async logExercise(input: unknown, workoutLogId: string): Promise<ExerciseLog> {
    try {
      const parsed = exerciseLogInputSchema.parse(input);
      return transact<ExerciseLog, ExerciseLog>('exerciseLogs', (rows) => {
        const entry: ExerciseLog = {
          id: newId(),
          workoutLogId,
          exerciseId: parsed.exerciseId,
          setsCompleted: parsed.setsCompleted,
          repsCompleted: parsed.repsCompleted,
          durationSeconds: parsed.durationSeconds,
          notes: parsed.notes,
          createdAt: nowIso(),
        };
        return { rows: rows.concat(entry), result: entry };
      }) as ExerciseLog;
    } catch (error) {
      return fail(error);
    }
  },

  async getById(id: string): Promise<WorkoutLogWithExercises | null> {
    return loadLogWithExercises(id);
  },

  async listRecent(limit = 10): Promise<WorkoutLog[]> {
    return [...select<WorkoutLog>('workoutLogs')]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  },
};

// --- Signups ---------------------------------------------------------------

const signupsAdapter: SignupCaptureAdapter = {
  async capture(email: string): Promise<EmailSignup> {
    try {
      const parsed = emailSchema.parse(email);
      return transact<EmailSignup, EmailSignup>('signups', (rows) => {
        const existing = rows.find((s) => s.email === parsed);
        if (existing) return { rows, result: existing };
        const signup: EmailSignup = { id: newId(), email: parsed, createdAt: nowIso() };
        return { rows: rows.concat(signup), result: signup };
      }) as EmailSignup;
    } catch (error) {
      return fail(error);
    }
  },
  async list(): Promise<EmailSignup[]> {
    return [...select<EmailSignup>('signups')].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
};

// --- Factory ---------------------------------------------------------------

/** Seeds the catalog into localStorage so filtering works offline. */
const seedCatalog = (): void => {
  if (select<Exercise>('exercises').length === 0) {
    transact<Exercise, void>('exercises', () => ({ rows: localExercises, result: undefined }));
  }
};

export const createLocalBackend = (): StorageAdapter => {
  if (isBrowser()) seedCatalog();
  return {
    kind: 'local',
    cloudConfigured: false,
    auth: localAuth,
    profiles: profilesAdapter,
    exercises: exercisesAdapter,
    plans: plansAdapter,
    logs: logsAdapter,
    signups: signupsAdapter,
  };
};

/** Wipes every local table. Exposed for the profile reset action. */
export const resetLocalData = (): void => {
  clearAll();
  if (isBrowser()) seedCatalog();
};
