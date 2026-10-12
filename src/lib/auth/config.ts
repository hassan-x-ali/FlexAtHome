/**
 * Is cloud auth available?
 *
 * Deliberately dependency-free. Client Components need this answer, and it must
 * not be imported from anything that reaches `next/headers` or any other
 * server-only module — that would drag those into the browser bundle and fail
 * the build.
 *
 * Reads the same public env vars as the Supabase client, so there is one source
 * of truth for "are accounts configured".
 */

/** True only when both browser-safe Supabase variables are present. */
export const cloudAuthEnabled = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && anonKey && url.length > 0 && anonKey.length > 0);
};
