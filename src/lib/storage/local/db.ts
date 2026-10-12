/**
 * localStorage persistence primitives.
 *
 * All keys are namespaced and versioned. Writes are atomic: a mutation builds
 * the next table, serialises it once, and only then commits to localStorage.
 * If serialisation or quota throws, the original data is left untouched.
 */
import { StorageError } from '@/lib/storage/types';

const NAMESPACE = 'flexat';
const SCHEMA_VERSION = 1;

export type TableName =
  | 'profiles'
  | 'plans'
  | 'days'
  | 'workoutExercises'
  | 'workoutLogs'
  | 'exerciseLogs'
  | 'exercises'
  | 'signups';

const storageKey = (table: TableName): string => `${NAMESPACE}:v${SCHEMA_VERSION}:${table}`;

type Envelope<T> = {
  version: number;
  rows: T[];
};

const isBrowser = (): boolean => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const empty = <T>(): Envelope<T> => ({ version: SCHEMA_VERSION, rows: [] });

function read<T>(table: TableName): Envelope<T> {
  if (!isBrowser()) return empty<T>();
  try {
    const raw = localStorage.getItem(storageKey(table));
    if (!raw) return empty<T>();
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('version' in parsed) ||
      !('rows' in parsed)
    ) {
      return empty<T>();
    }
    const candidate = parsed as Envelope<unknown>;
    if (candidate.version !== SCHEMA_VERSION) return empty<T>();
    if (!Array.isArray(candidate.rows)) return empty<T>();
    return { version: SCHEMA_VERSION, rows: candidate.rows as T[] };
  } catch {
    // Corrupt or unreadable entry: treat as empty rather than crashing boot.
    return empty<T>();
  }
}

function write<T>(table: TableName, rows: T[]): void {
  if (!isBrowser()) {
    throw new StorageError('unavailable', 'Local storage is not available in this environment');
  }
  const payload: Envelope<T> = { version: SCHEMA_VERSION, rows };
  let serialised: string;
  try {
    serialised = JSON.stringify(payload);
  } catch {
    throw new StorageError('validation_failed', 'Could not serialise data for local storage');
  }
  try {
    localStorage.setItem(storageKey(table), serialised);
  } catch {
    throw new StorageError(
      'unavailable',
      'Local storage is full. Clear some browser data and try again.',
    );
  }
  // Mirror into the cross-tab channel so other tabs can re-read.
  localStorage.setItem(`${storageKey(table)}:updatedAt`, String(Date.now()));
}

/**
 * Applies `mutate` to the current rows and commits the result atomically.
 * Returns whatever the mutator returns, typed.
 */
export const transact = <T, R = unknown>(
  table: TableName,
  mutate: (rows: T[]) => { rows: T[]; result: R },
): R => {
  const current = read<T>(table).rows;
  const { rows, result } = mutate(current);
  write(table, rows);
  return result;
};

/** Read-only access. */
export const select = <T>(table: TableName): T[] => read<T>(table).rows;

/** Wipes every namespaced key. Used by "reset local data" in settings. */
export const clearAll = (): void => {
  if (!isBrowser()) return;
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${NAMESPACE}:`)) doomed.push(key);
  }
  for (const key of doomed) localStorage.removeItem(key);
};
