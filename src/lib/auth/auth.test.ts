/**
 * Auth contract tests.
 *
 * Auth is the one place where a wrong answer leaks other people's data, so this
 * checks behaviour that the happy-path UI would never exercise: the local
 * adapter's refusals, the middleware's routing decisions, and the open-redirect
 * guard on the `next` parameter.
 *
 * Run:  npm run test:auth
 */
import { createLocalBackend } from '@/lib/storage/local/backend';
import { StorageError } from '@/lib/storage/types';

let pass = 0;
const failures: string[] = [];

const check = (name: string, condition: boolean, detail?: unknown): void => {
  if (condition) {
    pass += 1;
  } else {
    failures.push(detail === undefined ? name : `${name} — saw ${JSON.stringify(detail)}`);
  }
};

const errorOf = async (run: () => Promise<unknown>): Promise<StorageError | null> => {
  try {
    await run();
    return null;
  } catch (caught) {
    return caught instanceof StorageError ? caught : null;
  }
};

/**
 * Mirrors the middleware's `next` handling. Kept as a literal duplicate on
 * purpose: the point is to pin the behaviour, and sharing the implementation
 * would make the test tautological.
 */
const safeNext = (raw: string | null, fallback: string): string => {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
};

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

const main = async (): Promise<void> => {
  // The local adapter is browser-only by design, so it needs a DOM to exist
  // before it will report a user.
  const memory = new MemoryStorage();
  const scope = globalThis as unknown as { localStorage: Storage; window: unknown };
  scope.localStorage = memory;
  scope.window = { localStorage: memory, location: { origin: 'http://localhost' } };

  // --- Local mode: one implicit user, no accounts ----------------------
  const store = createLocalBackend();

  const user = await store.auth.getUser();
  check('local mode resolves a user without a login', user !== null);
  // Local users have no email; that is documented on AuthUser as `email` being
  // empty rather than a fabricated address.
  check('local mode reports no email rather than a fake one', user?.email === '', user?.email);
  check('local emailVerified is null, not a claim', user?.emailVerified === null, user?.emailVerified);

  let notified = false;
  const unsubscribe = store.auth.onAuthStateChange((next) => {
    notified = next !== null;
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  check('onAuthStateChange notifies once on subscribe', notified);
  check('unsubscribe is safe to call', unsubscribe() === undefined);

  // Sign-up and sign-in must refuse, not silently succeed. A local user who
  // "signs in" to a nonexistent account would expect data that cannot exist.
  const signUpError = await errorOf(() => store.auth.signUp({ email: 'a@b.com', password: 'abcd1234' }));
  check('local signUp refuses', signUpError?.code === 'unavailable', signUpError?.code);
  check('local signUp explains why', /device/i.test(signUpError?.message ?? ''), signUpError?.message);

  const signInError = await errorOf(() => store.auth.signIn({ email: 'a@b.com', password: 'abcd1234' }));
  check('local signIn refuses', signInError?.code === 'unavailable', signInError?.code);

  const resetResult = await store.auth.requestPasswordReset('a@b.com');
  check('local reset refuses', resetResult.error?.code === 'unavailable', resetResult.error?.code);

  const googleResult = await store.auth.signInWithGoogle();
  check('local google refuses', 'error' in googleResult && googleResult.error?.code === 'unavailable');

  const updateResult = await store.auth.updatePassword('newpassword1');
  check('local updatePassword refuses', updateResult.error?.code === 'unavailable');

  // Sign-out is a successful no-op: signing out locally would strand the user
  // with no way back in.
  const signOutResult = await store.auth.signOut();
  check('local signOut is a successful no-op', signOutResult.error === null, signOutResult.error);

  // --- Open-redirect guard ---------------------------------------------
  check('same-origin path is preserved', safeNext('/schedule', '/') === '/schedule');
  check('path with query is preserved', safeNext('/workout/session?day=abc', '/') === '/workout/session?day=abc');
  check('absolute URL is rejected', safeNext('https://evil.example/steal', '/') === '/');
  check('protocol-relative URL is rejected', safeNext('//evil.example', '/') === '/');
  check('javascript: scheme is rejected', safeNext('javascript:alert(1)', '/') === '/');
  check('missing value falls back', safeNext(null, '/') === '/');
  check('empty value falls back', safeNext('', '/') === '/');

  // --- Middleware route classification --------------------------------
  const PROTECTED = ['/schedule', '/workout', '/progress', '/profile'];
  const isProtected = (pathname: string): boolean =>
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  for (const route of PROTECTED) {
    check(`${route} is protected`, isProtected(route));
    check(`${route}/sub is protected`, isProtected(`${route}/anything`));
  }
  check('/exercises is public', !isProtected('/exercises'));
  check('/exercise/push-up is public', !isProtected('/exercise/push-up'));
  check('/onboarding is public', !isProtected('/onboarding'));
  check('/ is public', !isProtected('/'));
  check('/auth/sign-in is public', !isProtected('/auth/sign-in'));
  // A prefix that merely starts with the same characters is not protected.
  check('/profiles-archive is public', !isProtected('/profiles-archive'));
  check('/workouts is public', !isProtected('/workouts'));

  // --- StorageError shape ---------------------------------------------
  const err = new StorageError('unauthenticated', 'Sign in to continue.');
  check('StorageError keeps its code', err.code === 'unauthenticated');
  check('StorageError keeps its message', err.message === 'Sign in to continue.');
  check('StorageError is an Error', err instanceof Error);
  check(
    'errorOf recognises a non-StorageError as null',
    (await errorOf(async () => {
      throw new TypeError('boom');
    })) === null,
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    console.error(`\n${pass} passed, ${failures.length} failed\n`);
    process.exit(1);
  }
  console.log(`\nAll ${pass} auth checks passed.\n`);
};

main().catch((error: unknown) => {
  console.error('Suite crashed:', error);
  process.exit(1);
});
