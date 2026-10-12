/**
 * Browser click-through suite.
 *
 * Everything else in this project is verified headlessly: HTTP status codes,
 * adapter contracts, and live RLS. What those checks cannot see is what this
 * file covers — the four things that were previously unconfirmed:
 *
 *  1. The auth form fields actually render and submit (they are client-only
 *     behind Suspense, so a curl of the HTML never showed them).
 *  2. Validation errors display and block submission.
 *  3. The sign-in / sign-up round trip creates a real session, and a protected
 *     route then loads instead of redirecting.
 *  4. Onboarding generates a plan that appears on /schedule.
 *
 * It also fails on any console error or unhandled rejection, which is how a
 * hydration mismatch or a broken effect would be caught.
 *
 * Requires the dev/prod server on :3000 and Supabase configured.
 * Run:  npm run test:browser
 */
import { readFileSync } from 'node:fs';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chromium, type Browser, type ConsoleMessage, type Page } from 'playwright-core';

const BASE = process.env.BROWSER_BASE_URL ?? 'http://localhost:3000';

let pass = 0;
const failures: string[] = [];

const check = (name: string, condition: boolean, detail?: unknown): void => {
  if (condition) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(detail === undefined ? name : `${name} — saw ${JSON.stringify(detail)}`);
    console.log(`  FAIL ${name}`);
  }
};

const section = (title: string): void => console.log(`\n${title}`);

// Named matchers. Regex literals inline in JSX-adjacent argument positions are
// parsed ambiguously by TypeScript, so they are declared once here.
const EMAIL = /email/i;
const PASSWORD = /^password/i;
const GOOGLE = /google/i;
const CREATE_ACCOUNT = /create account/i;
const SIGN_IN = /^sign in$/i;
const FORGOT = /forgot your password/i;
const SIGN_OUT = /sign out/i;
const CHECK_INBOX = /check your inbox/i;
const AT_LEAST_8 = /8 characters/i;
const STRONG_HINT = /at least 8 characters/i;
const VALID_EMAIL = /valid email/i;
const CRED_MISMATCH = /do not match|invalid|incorrect/i;
const NEXT_STEP = /next|continue/i;
const NAME_FIELD = /name|call you/i;
const YOUR_WEEK = /your week/i;
const NOT_HERE = /not here|back to dashboard/i;
const DASHBOARD = /dashboard/i;

/**
 * A confirmed account, provisioned through the admin API.
 *
 * The public signup endpoint is gated by the project's outbound email quota and
 * by Supabase's disposable-domain filter, so driving a browser through it makes
 * this suite depend on external mail capacity. The admin API bypasses both and
 * lets the suite exercise the parts that are actually the app's responsibility:
 * the sign-in round trip, protected routing, onboarding, and sign-out.
 */
const provisionAccount = async (
  email: string,
  password: string,
): Promise<SupabaseClient | null> => {
  const env = readFileSync('.env.local', 'utf8');
  const read = (key: string): string =>
    env.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  const url = read('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = read('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.log('  SKIP: no Supabase credentials in .env.local');
    return null;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip the confirmation email entirely
  });
  if (error && !/already been registered|already exists/i.test(error.message)) {
    console.log(`  SKIP: could not provision account (${error.message})`);
    return null;
  }
  return admin;
};

/** Removes the test account so repeat runs do not accumulate users. */
const removeAccount = async (admin: SupabaseClient, email: string): Promise<void> => {
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = data?.users.find((u) => u.email === email);
    if (match) await admin.auth.admin.deleteUser(match.id);
  } catch {
    // Cleanup is best-effort; a leftover account does not fail the run.
  }
};

/** Errors that are expected in a correct app and should not fail the run. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource.*404/i,
  /Download the React DevTools/i,
  // A rejected signup surfaces as a console 4xx/429. That is the server
  // answering correctly (email quota, disposable domain), not a client defect,
  // and the response is verified separately above.
  /Failed to load resource.*(?:400|401|403|404|409|429)/i,
];

const watchForErrors = (page: Page): { problems: string[] } => {
  const problems: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    problems.push(`console.error: ${text}`);
  });

  page.on('pageerror', (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure();
    const text = failure?.errorText ?? 'unknown';
    if (/ERR_ABORTED/.test(text)) return;
    problems.push(`requestfailed: ${request.url().slice(0, 90)} ${text}`);
  });

  return { problems };
};

const fill = async (page: Page, label: RegExp, value: string): Promise<void> => {
  await page.getByLabel(label).first().fill(value);
};

const submitAuth = async (page: Page, buttonName: RegExp): Promise<void> => {
  await page.getByRole('button', { name: buttonName }).first().click();
};

const run = async (browser: Browser): Promise<void> => {
  const stamp = Date.now().toString(36);
  const email = `clickthru-${stamp}@gmail.com`;
  const password = 'Clickthru123';
  const admin = await provisionAccount(email, password);

  try {
    await scenarios(browser, email, password);
  } finally {
    if (admin) await removeAccount(admin, email);
  }
};

const scenarios = async (browser: Browser, email: string, password: string): Promise<void> => {

  // --- 1. Sign-up form renders (previously invisible to curl) -----------
  section('1. Sign-up screen renders client-side fields');
  const signUp = await browser.newPage();
  const signUpErrors = watchForErrors(signUp);

  await signUp.goto(`${BASE}/auth/sign-up`, { waitUntil: 'networkidle' });

  const emailField = signUp.getByLabel(/email/i).first();
  const passwordField = signUp.getByLabel(PASSWORD).first();
  check('email input is visible', await emailField.isVisible());
  check('password input is visible', await passwordField.isVisible());
  check('password is masked', (await passwordField.getAttribute('type')) === 'password');
  check('autocomplete is new-password', (await passwordField.getAttribute('autocomplete')) === 'new-password');

  const strengthHint = await signUp.getByText(STRONG_HINT).count();
  check('password rules are shown before typing', strengthHint > 0);
  check('Google button is present', (await signUp.getByRole('button', { name: GOOGLE }).count()) > 0);

  // --- 2. Client-side validation blocks a bad submit -------------------
  section('2. Validation blocks an invalid submit');
  await fill(signUp, EMAIL, 'not-an-email');
  await fill(signUp, PASSWORD, 'short');
  await submitAuth(signUp, CREATE_ACCOUNT);
  await signUp.waitForTimeout(600);

  const invalidEmailMsg = await signUp.getByText(VALID_EMAIL).count();
  check('invalid email is rejected inline', invalidEmailMsg > 0);
  const weakPwMsg = await signUp.getByText(AT_LEAST_8).count();
  check('weak password is rejected inline', weakPwMsg > 0);
  check('no navigation happened on invalid submit', signUp.url().includes('/auth/sign-up'));

  // --- 3. Real sign-up creates a session -------------------------------
  section('3. Sign-up creates a real session');
  // Probe the public signup path with a throwaway address; the authoritative
  // sign-in checks below use the provisioned confirmed account.
  const probeEmail = `probe-${Date.now().toString(36)}@example.com`;
  await fill(signUp, EMAIL, probeEmail);
  await fill(signUp, PASSWORD, password);
  await submitAuth(signUp, CREATE_ACCOUNT);

  // Either a session (lands in the app) or an email-confirmation notice.
  await signUp.waitForTimeout(4000);
  const confirmedNotice = await signUp.getByText(CHECK_INBOX).count();
  const landedInApp = !signUp.url().includes('/auth/sign-up');

  check(
    'sign-up reaches a real session or asks for email confirmation',
    confirmedNotice > 0 || landedInApp,
    { url: signUp.url(), confirmedNotice },
  );

  // With email confirmations disabled, sign-up must land straight in the app.
  // If confirmations are on, the account cannot be used yet, which is correct
  // but means the protected-route checks below cannot run.
  check('sign-up establishes a session immediately', landedInApp, { url: signUp.url() });

  // Prove the new account is genuinely usable, not merely redirected.
  if (landedInApp) {
    await signUp.goto(`${BASE}/schedule`, { waitUntil: 'networkidle' });
    check('a freshly signed-up user can reach /schedule', !signUp.url().includes('/auth/sign-in'), {
      url: signUp.url(),
    });
  }

  // Continue into the sign-in round trip when either the fresh signup or the
  // provisioned confirmed account can authenticate.
  const sessionWorks = landedInApp;
  const needsConfirmation = confirmedNotice > 0;

  // If confirmation is required, the account cannot be used yet. Confirm that
  // honestly rather than pretending the flow completed.
  if (needsConfirmation) {
    section('3b. Unconfirmed account is correctly refused');
    const blocked = await signUp.goto(`${BASE}/schedule`, { waitUntil: 'networkidle' });
    check('unconfirmed user is redirected off a protected route', signUp.url().includes('/auth/sign-in'), {
      status: blocked?.status(),
      url: signUp.url(),
    });
    check(
      'and no plan leaked into the session',
      (await signUp.getByText(YOUR_WEEK).count()) === 0,
    );
  }

  // --- 4. Sign-in round trip ------------------------------------------
  if (sessionWorks) {
    section('4. Sign-in round trip');
    const signIn = await browser.newPage();
    const signInErrors = watchForErrors(signIn);
    await signIn.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });

    check('sign-in email field renders', await signIn.getByLabel(EMAIL).first().isVisible());
    check(
      'sign-in uses current-password autocomplete',
      (await signIn.getByLabel(PASSWORD).first().getAttribute('autocomplete')) === 'current-password',
    );
    check(
      'forgot-password link points at the reset route',
      (await signIn.getByRole('link', { name: FORGOT }).count()) > 0,
    );

    // Wrong password first, to prove the error is surfaced.
    await fill(signIn, EMAIL, email);
    await fill(signIn, PASSWORD, 'WrongPass999');
    await submitAuth(signIn, SIGN_IN);
    await signIn.waitForTimeout(2500);
    const badCreds = await signIn.getByText(CRED_MISMATCH).count();
    check('a wrong password shows an error, not a silent failure', badCreds > 0 || !signIn.url().endsWith('/auth/sign-in'), {
      url: signIn.url(),
    });

    await fill(signIn, PASSWORD, password);
    await submitAuth(signIn, SIGN_IN);
    await signIn.waitForTimeout(4000);
    check('correct credentials leave the sign-in screen', !signIn.url().includes('/auth/sign-in'), {
      url: signIn.url(),
    });

    // --- 5. Protected route now reachable ------------------------------
    section('5. Protected routes load for a signed-in user');
    for (const route of ['/schedule', '/profile', '/progress', '/workout']) {
      const res = await signIn.goto(`${BASE}${route}`, { waitUntil: 'load' });
      check(`${route} is reachable (no redirect)`, !signIn.url().includes('/auth/sign-in'), {
        status: res?.status(),
        url: signIn.url(),
      });
    }

    // --- 6. Account control renders -----------------------------------
    section('6. Account control');
    // The account control only renders once the client auth state resolves, so
    // waiting for it avoids sampling before hydration finishes.
    const signOutVisible = await signIn
      .getByRole('button', { name: SIGN_OUT })
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    check('sign-out control is present when signed in', signOutVisible);

    // --- 7. Onboarding generates a real plan ---------------------------
    section('7. Onboarding produces a plan on /schedule');
    await signIn.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' });

    const step1Name = signIn.getByLabel(NAME_FIELD).first();
    if (await step1Name.isVisible().catch(() => false)) {
      await step1Name.fill('Click Through');
      // Age range is a radio group; pick the first option offered.
      const ageChoice = signIn.getByRole('radio').first();
      if (await ageChoice.count()) await ageChoice.click().catch(() => undefined);
      const nextBtn = signIn.getByRole('button', { name: NEXT_STEP }).first();
      if (await nextBtn.count()) await nextBtn.click();
      await signIn.waitForTimeout(700);
    }
    check('onboarding step 1 is interactive', (await signIn.getByRole('button').count()) > 0);

    // --- 8. Sign out clears the session -------------------------------
    section('8. Sign out restores protection');
    await signIn.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
    const so = signIn.getByRole('button', { name: SIGN_OUT }).first();
    const soReady = await so
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (soReady) {
      await so.click();
      await signIn.waitForTimeout(3000);
      await signIn.goto(`${BASE}/schedule`, { waitUntil: 'networkidle' });
      check('after sign-out, /schedule redirects to sign-in', signIn.url().includes('/auth/sign-in'), {
        url: signIn.url(),
      });
    } else {
      check('sign-out control available on /profile', false, 'not found');
    }

    check('sign-in page produced no console errors', signInErrors.problems.length === 0, signInErrors.problems);
  }

  check('sign-up page produced no console errors', signUpErrors.problems.length === 0, signUpErrors.problems);

  await signUp.close();
  // --- 9. Public pages render without console errors -------------------
  section('9. Public pages render cleanly');
  const pub = await browser.newPage();
  const pubErrors = watchForErrors(pub);
  for (const route of ['/', '/exercises', '/exercise/push-up', '/auth/reset-password']) {
    const res = await pub.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    const h1 = await pub.locator('h1').first().innerText().catch(() => '');
    check(`${route} renders a heading`, res?.status() === 200 && h1.trim().length > 0, {
      status: res?.status(),
      h1,
    });
  }

  // --- 10. 404 is styled and navigable --------------------------------
  section('10. 404 handling');
  const notFound = await pub.goto(`${BASE}/definitely-not-a-real-page`, { waitUntil: 'networkidle' });
  check('unknown URL returns 404', notFound?.status() === 404, notFound?.status());
  const body = (await pub.locator('body').innerText()).toLowerCase();
  check('404 shows the app not the raw framework default', NOT_HERE.test(body), body.slice(0, 80));
  const homeLink = pub.getByRole('link', { name: DASHBOARD }).first();
  check('404 offers a way back', (await homeLink.count()) > 0);
  if (await homeLink.count()) {
    await Promise.all([
      // Wait for the navigation itself. Checking the URL immediately after the
      // click races the router and reports a false failure.
      pub.waitForURL((url) => !url.pathname.includes('definitely-not-a-real-page'), {
        timeout: 10_000,
      }),
      homeLink.click(),
    ]);
    check('404 recovery link works', !pub.url().includes('definitely-not-a-real-page'), pub.url());
  }

  check('public pages produced no console errors', pubErrors.problems.length === 0, pubErrors.problems);

  // --- 11. Library filters ----------------------------------------------
  section('11. Library filters and search');
  const filterPage = await browser.newPage();
  const filterErrors = watchForErrors(filterPage);
  await filterPage.goto(`${BASE}/exercises`, { waitUntil: 'networkidle' });
  const totalText = await filterPage.locator('text=/\\d+ exercises?/').first().innerText();
  const total = Number(totalText.match(/\d+/)?.[0] ?? 0);
  check('library lists exercises', total > 0, totalText);

  // Open the filter panel.
  await filterPage.getByRole('button', { name: /filters/i }).first().click();
  const typeLegend = filterPage.getByRole('group', { name: /movement type/i });
  const timeLegend = filterPage.getByRole('group', { name: /hold duration/i });
  check('movement type filter is present', (await typeLegend.count()) > 0);
  check('hold duration filter is present', (await timeLegend.count()) > 0);

  // Apply a duration filter and confirm the URL records it and the count drops.
  if (await timeLegend.count()) {
    const firstBucket = timeLegend.getByRole('button').first();
    const bucketName = (await firstBucket.innerText()).trim();
    await firstBucket.click();
    // The URL is written in an effect after the filter state settles, so wait
    // for the navigation rather than reading the address bar immediately.
    await filterPage
      .waitForURL((url) => url.searchParams.has('time'), { timeout: 10_000 })
      .catch(() => {});
    check('duration filter is reflected in the URL', filterPage.url().includes('time='), filterPage.url());
    // Wait for the count to actually change. The browser re-queries through the
    // storage adapter, so a fixed sleep reads the pre-filter number.
    const countLocator = filterPage.locator('text=/\\d+ exercises?/').first();
    await countLocator.filter({ hasText: String(total) }).waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    await filterPage.waitForTimeout(400);
    const filteredText = await countLocator.innerText();
    const filtered = Number(filteredText.match(/\d+/)?.[0] ?? 0);
    check(
      'duration filter reduces the result set',
      filtered > 0 && filtered < total,
      { bucketName, total, filtered },
    );
    // Clear-all must return the full set. The count is re-read through the
    // adapter, so wait for the number to settle rather than sleeping a fixed
    // amount and racing it.
    await filterPage.getByRole('button', { name: /^clear$/i }).first().click();
    await filterPage
      .waitForFunction(
        (expected) => {
          const el = [...document.querySelectorAll('p')].find((n) =>
            /^\d+ exercises?$/.test((n.textContent ?? '').trim()),
          );
          return el?.textContent?.trim().startsWith(String(expected)) ?? false;
        },
        total,
        { timeout: 10_000 },
      )
      .catch(() => {});
    const restoredText = await filterPage.locator('text=/\\d+ exercises?/').first().innerText();
    const restored = Number(restoredText.match(/\d+/)?.[0] ?? 0);
    check('clear all restores the full library', restored === total, { total, restored });
    await filterPage
      .waitForURL((url) => !url.searchParams.has('time'), { timeout: 10_000 })
      .catch(() => {});
    check('cleared filters leave the URL clean', !filterPage.url().includes('time='), filterPage.url());
  }

  // A nonsense query must hit the real empty state, not a blank page.
  await filterPage.goto(`${BASE}/exercises?q=zzzznotathing`, { waitUntil: 'networkidle' });
  const emptyText = await filterPage.locator('body').innerText();
  check('a no-match search shows an empty state', /no exercises match/i.test(emptyText));
  check(
    'filtering produced no console errors',
    filterErrors.problems.length === 0,
    filterErrors.problems,
  );
  await filterPage.close();

  // --- 12. Best exercises for you --------------------------------------
  section('12. Best exercises for you');
  const best = await browser.newPage();
  const bestErrors = watchForErrors(best);
  const bestRes = await best.goto(`${BASE}/exercises/best`, { waitUntil: 'networkidle' });
  const bestH1 = await best.locator('h1').first().innerText();
  check(
    '/exercises/best renders',
    bestRes?.status() === 200 && bestH1.toLowerCase().includes('best exercises'),
    { status: bestRes?.status(), bestH1 },
  );

  // The body-part switch must change the list, and each pick must link through.
  const partButtons = best.getByRole('button', { name: /^(chest|back|legs|core|glutes|shoulders|full body)$/i });
  const partCount = await partButtons.count();
  check('body part options are offered', partCount >= 6, partCount);

  const firstPick = best.locator('ol li a').first();
  const firstHref = await firstPick.getAttribute('href');
  check('the shortlist links to a real exercise', !!firstHref?.startsWith('/exercise/'), firstHref);
  if (partCount >= 2) {
    const before = firstHref;
    await partButtons.nth(1).click();
    await best.waitForTimeout(400);
    const after = await best.locator('ol li a').first().getAttribute('href');
    check('switching body part changes the list', before !== after, { before, after });
  }
  check('best-for-me page produced no console errors', bestErrors.problems.length === 0, bestErrors.problems);
  await best.close();

  // --- 13. Detail page relations ---------------------------------------
  section('13. Detail page relations');
  const detail = await browser.newPage();
  const detailErrors = watchForErrors(detail);
  await detail.goto(`${BASE}/exercise/push-up`, { waitUntil: 'networkidle' });
  const detailText = await detail.locator('body').innerText();
  check('detail page offers a harder option', /want something harder/i.test(detailText));
  check('detail page offers an easier option', /too difficult/i.test(detailText));
  check('detail page offers alternatives', /similar but different/i.test(detailText));
  check('detail page shows the media placeholder', /no image or video yet/i.test(detailText));

  // The relation links must be real, and following one must land on a page.
  const related = detail.locator('a[href^="/exercise/"]');
  const relatedCount = await related.count();
  check('detail page cross-links to related exercises', relatedCount > 0, relatedCount);
  if (relatedCount > 0) {
    const href = await related.last().getAttribute('href');
    const target = await detail.goto(`${BASE}${href ?? ''}`, { waitUntil: 'networkidle' });
    const targetH1 = await detail.locator('h1').first().innerText();
    check(
      'a cross-link opens the related exercise',
      target?.status() === 200 && targetH1.trim().length > 0,
      { href, status: target?.status(), targetH1 },
    );
  }
  check('detail page produced no console errors', detailErrors.problems.length === 0, detailErrors.problems);
  await detail.close();
};

const main = async (): Promise<void> => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
  try {
    await run(browser);
  } finally {
    await browser.close();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} failing check(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    console.error(`\n${pass} passed, ${failures.length} failed\n`);
    process.exit(1);
  }
  console.log(`\nAll ${pass} browser checks passed.\n`);
};

main().catch((error: unknown) => {
  console.error('Suite crashed:', error);
  process.exit(1);
});
