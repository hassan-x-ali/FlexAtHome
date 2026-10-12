/**
 * Server-side Supabase client bound to the request cookie session.
 *
 * Used by Server Components and Route Handlers so auth state is read from the
 * verified cookie rather than from anything the client asserts. RLS still
 * applies: this is the anon key with a user session, not a privileged role.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './client';

export const createServerSupabase = async () => {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Thrown when called from a Server Component, where cookies are
          // read-only. Middleware refreshes the session, so this is safe.
        }
      },
    },
  });
};
