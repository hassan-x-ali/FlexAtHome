/**
 * Supabase session proxy (Next 16's name for what used to be middleware).
 *
 * Two jobs, both of which need to happen on the edge of every request:
 *
 *  1. Refresh the session. Supabase access tokens are short-lived, so an
 *     expired one is silently rotated here and written back to cookies. Without
 *     this, Server Components would eventually read a stale session and RLS
 *     would reject every user-scoped query.
 *  2. Keep unauthenticated users out of the app routes, and signed-in users out
 *     of the auth screens.
 *
 * Deliberately a no-op when Supabase is not configured. The app is local-first:
 * with no cloud env vars it has no accounts at all, so requiring a session would
 * lock everyone out of a perfectly working app. This is the supported default,
 * not a fallback.
 */
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/** Routes that require a session. Landing and auth screens stay public. */
const PROTECTED_PREFIXES = ['/schedule', '/workout', '/progress', '/profile'];

const AUTH_ROUTES = ['/auth/sign-in', '/auth/sign-up', '/auth/reset-password'];

const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isAuthRoute = (pathname: string): boolean => AUTH_ROUTES.includes(pathname);

export const updateSession = async (request: NextRequest): Promise<NextResponse> => {
  // No cloud configuration means no accounts: nothing to refresh or protect.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to the request so downstream Server Components see the fresh
        // session, and to the response so the browser stores it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must be getUser(), not getSession(): this validates the token against the
  // auth server instead of trusting whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const redirect = request.nextUrl.clone();
    // Remember where they were headed so sign-in can send them back.
    redirect.pathname = '/auth/sign-in';
    redirect.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthRoute(pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/';
    redirect.search = '';
    return NextResponse.redirect(redirect);
  }

  return response;
};

/**
 * The per-request entry point Next invokes.
 *
 * `updateSession` is kept separate and exported so the routing decisions can be
 * exercised directly by tests without a request.
 */
export default async function proxy(request: NextRequest): Promise<NextResponse> {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimization output. Auth
     * callback routes are included: the session must be established there
     * before the redirect is followed.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
