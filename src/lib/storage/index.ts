/**
 * Backend selection.
 *
 * This is the single place that decides which backend the app uses. Everything
 * downstream calls `getBackend()` and receives a `StorageAdapter` with no
 * knowledge of what is behind it.
 *
 * Rules:
 *  - Supabase env vars present  → SupabaseBackend
 *  - otherwise                  → LocalBackend (always works)
 *
 * Selection happens once per process and the result is cached, so a missing
 * optional integration is not re-probed on every call. A missing integration is
 * a supported configuration, never an error.
 */
import { createLocalBackend } from '@/lib/storage/local/backend';

export { StorageError } from '@/lib/storage/types';
export type { StorageAdapter, AuthUser, ExerciseQuery } from '@/lib/storage/types';
import { createSupabaseBackend } from '@/lib/storage/supabase/backend';
import { isSupabaseConfigured } from '@/lib/storage/supabase/client';
import type { StorageAdapter } from '@/lib/storage/types';

let cached: StorageAdapter | null = null;

/**
 * The active storage adapter. Safe to call from Client Components.
 * On the server it returns a fresh adapter per request; in the browser the
 * instance is cached so the auth listener is attached once.
 */
export const getBackend = (): StorageAdapter => {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    cached = isSupabaseConfigured() ? (createSupabaseBackend() ?? createLocalBackend()) : createLocalBackend();
    return cached;
  }
  // Server: never hand out a module-scoped instance that could leak between
  // requests. The local backend is stateless on the server because every
  // method guards on `window` being present.
  return isSupabaseConfigured() ? (createSupabaseBackend() ?? createLocalBackend()) : createLocalBackend();
};

/** True when the cloud backend is in use. Drives the "syncing" UI hint. */
export const isCloudActive = (): boolean => getBackend().kind === 'supabase';

/**
 * Whether cloud sync is merely unavailable or actively configured. Surfaces the
 * one-time informational note in the UI.
 */
export const cloudStatus = (): 'active' | 'not-configured' =>
  getBackend().kind === 'supabase' ? 'active' : 'not-configured';
