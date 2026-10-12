/**
 * Supabase client factories.
 *
 * Two clients exist by design:
 *  - `browserClient` — anon key only, used for user-scoped reads and writes.
 *    Subject to RLS. Safe in the browser.
 *  - `serverClient` — cookie-backed session for Server Components and Route
 *    Handlers. Also anon-key based; RLS is still enforced.
 *
 * The service-role key is never imported here and never reaches the browser.
 * It is read only in `server/admin.ts`, which is imported solely by the seed
 * script — never by a page or component.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True only when both browser-safe variables are present and non-empty. */
export const isSupabaseConfigured = (): boolean =>
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

let browserClient: SupabaseClient | null = null;

/** Singleton, because a second client would duplicate the auth listener. */
export const browserClientOrNull = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
};
