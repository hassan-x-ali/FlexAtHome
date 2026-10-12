/**
 * Supabase auth callback.
 *
 * Supabase redirects here after email confirmation, password recovery, and
 * OAuth. The tokens arrive as a URL fragment, which the browser client reads and
 * exchanges for a session; this handler's job is to bounce the user onward to
 * the right page.
 *
 * Two query parameters drive the destination:
 *  - `next` — where the user was trying to go before being asked to sign in
 *  - a Supabase error, which takes priority so failures are never silent
 */
import { NextResponse, type NextRequest } from 'next/server';

/** Only same-origin paths, so `next` cannot be used as an open redirect. */
const safeNext = (raw: string | null, fallback: string): string => {
  if (!raw) return fallback;
  // Reject absolute URLs and protocol-relative URLs; allow leading single slash.
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
};

export const GET = (request: NextRequest): NextResponse => {
  const { searchParams } = request.nextUrl;
  const error = searchParams.get('error_description') ?? searchParams.get('error');
  const next = safeNext(searchParams.get('next'), '/schedule');

  if (error) {
    // recovery=1 tells the reset page to show the recovery form, since a valid
    // recovery link means the user is mid-password-change, not just signed out.
    const reason = searchParams.get('error') === 'access_denied' ? 'recovery' : 'signin';
    const target = new URL('/auth/reset-password', request.url);
    target.searchParams.set('reason', reason);
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, request.url));
};
