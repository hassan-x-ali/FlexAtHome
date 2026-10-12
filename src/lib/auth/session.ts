/**
 * Server-side session reads.
 *
 * Server Components and Route Handlers need to know who is signed in without
 * shipping a client component or trusting anything the browser asserts. These
 * helpers read the verified cookie session via the anon-key client, so RLS is
 * still the enforcement boundary.
 *
 * Every function resolves rather than throws: a storage or network problem must
 * degrade to "signed out", never crash a page render.
 */
import { redirect } from 'next/navigation';

import { createServerSupabase } from '@/lib/storage/supabase/server';
import { isSupabaseConfigured } from '@/lib/storage/supabase/client';
import type { AuthUser } from '@/lib/storage/types';

// Re-exported for server callers. Client Components must import
// `cloudAuthEnabled` from '@/lib/auth/config' instead, because this module
// reaches `next/headers` and cannot enter a browser bundle.
export { cloudAuthEnabled } from '@/lib/auth/config';

const toUser = (user: {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
} | null): AuthUser | null =>
  user
    ? { id: user.id, email: user.email ?? '', emailVerified: user.email_confirmed_at != null }
    : null;

/** The signed-in user, or null. Never throws. */
export const getServerUser = async (): Promise<AuthUser | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return toUser(data.user);
  } catch {
    return null;
  }
};

/** Redirects to sign-in when there is no session. Use in Server Components. */
export const requireServerUser = async (nextPath: string): Promise<AuthUser> => {
  const user = await getServerUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(nextPath)}`);
  return user;
};
