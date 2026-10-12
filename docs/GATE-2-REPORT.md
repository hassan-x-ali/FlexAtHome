# FlexAt Home — Gate 2 Report

Date: 2026-10-02
Directory: /home/ali-hassan/Documents/MatToMuscle
Project: flexat-home (Next.js 16 App Router, TypeScript, Tailwind v4, React 19)
Phase: Phase 4 closure (catalog expansion + route rename + relations graph + ranking)

Scope: extends Gate 1 report (`docs/GATE-1-REPORT.md`). Gate 1 covered phases
1A–1E. This report covers everything since, up to and including the catalog
expansion to 84 exercises.

## Verified this session (order executed, all green)

- npm run typecheck                       → 0 errors (strict, noUncheckedIndexedAccess)
- npm run lint                            → 0 errors, 0 warnings
- npm run build                           → 98/98 pages prerendered (was 58/58 at Gate 1)
- npm run test:adapter                    → 67/67 contract checks (local backend + storage boundary)
- npm run test:auth                       → 38/38 auth checks (validation, storage, route protection)
- npm run test:generator                  → 62/62 generator checks
- npm run test:generator:e2e              → 21/21 generator end-to-end checks
- npm run test:ranking                    → 47/47 ranking checks (relations graph + ranking correctness)
- npm run db:verify                       → 24/24 live cloud checks (RLS, ownership, one-active plan, etc.)
- npm run test:browser                    → 56/56 click-through checks (production build, Chrome 153)

Build page count grew from 58 to 98 because every exercise detail page
(`/exercise/<slug>`) is now statically prerendered (84 details) plus the six
`/exercises/best` ranked variants and existing routes.

## Catalog state (the headline change)

84 exercises (was 48):

| Difficulty   | Before | After |
|--------------|--------|-------|
| beginner     | 35     | 42    |
| intermediate | 15     | 26    |
| advanced     | 5      | 16    |

Every `MUSCLE_GROUPS` primary now has ≥5 exercises. Before this expansion,
9 muscles had <4 catalog entries (adductors 2, calves 3, deltoids 3,
erector_spine 3, full_body 3, hamstrings 3, hip_flexors 3, obliques 3, triceps 3).

Additions were deliberate, targeted at the thin primaries: Copenhagen plank
chain (beginner → full), Nordic curl chain (eccentric → single-leg),
adductor work (side-lying raise, curtsy lunge with reach), handstand-wall
progression, plyometric variants, anti-rotation and locomotion drills.

## Relations graph

Every exercise has at least one relation (progression, regression, alternative)
and every slug referenced in `src/lib/domain/exercise-relations.ts` resolves
to a real catalog entry. Validator `validateRelations()` runs at module load
in dev only and is exported for tests. Direction is honest: regressions never
harder, progressions never easier (enforced by `test:ranking` check 3).

Key graph fixes made during this session:

- `doorway-row-wide-grip` was incorrectly pointing at the *beginner*
  self-resisted isometric as a progression. Corrected: regression on wide-grip,
  progression back-link on the isometric.
- `single-leg-box-squat` regression to `bulgarian-split-squat` was reversed
  (Bulgarian is harder); now Bulgarian is a progression target.
- Four dangling slugs removed (`scripting-note` × 2, `side-lying-adductor-squeeze`,
  `slider-curl-towel`) and replaced with real catalog entries.

## Route split

- `/exercises`           → browse grid (kept)
- `/exercises/best`      → ranked "best for you" page (kept, plural path)
- `/exercise/[slug]`     → detail page (NEW — spec path)
- `/exercises/[slug]`    → 308 permanent redirect to `/exercise/<slug>` (shim)

Config-level redirect was unusable: it would have shadowed `/exercises/best`.
The shim is a `permanentRedirect()` in `app/(app)/exercises/[slug]/page.tsx`
and coexists with the static `/exercises/best` route without conflict.

Five link sites updated: `ExerciseCard`, `BestExercises`, `ExerciseBrowser`,
`ScheduleView`, `FeaturedExercises`. Two test suites updated:
`auth.test.ts` public-path check, `browser.test.ts` detail routes.

## Type/enum corrections applied during expansion

- `shoulders` was being used as a muscle; it is only a body part. Muscles are
  `deltoids`, `traps`, `rhomboids`, `erector_spine`, etc. Two new entries
  fixed.
- Invalid `exerciseType` literals (`'mobility'`, `'plyometric'`) mapped to
  canonical values (`'stretch'`, `'jump'`).
- Six shorthand `safetyNotes,` placeholders replaced with real guidance text.
- `exerciseType` added where missing.

## Storage adapter / backend parity

Both local and cloud backends implement the Phase 2D unified filter set:
`difficulty`, `bodyParts`, `primaryMuscles`, `exerciseTypes`,
`requiresNoEquipment`, `durationBuckets`. `DURATION_BUCKETS` and
`durationBucketOf()` are in `src/lib/exercises/duration.ts`. Cloud filter
parity is exercised by `test:adapter` against mocks.

## Cloud state and what is NOT yet applied

- Cloud catalog serves **48** stale rows. Local catalog is 84.
- `supabase/seed.sql` is the 55-exercise version — stale.
- Application of the 84-exercise seed is blocked on `SUPABASE_DB_URL`
  authentication. Once the user provides a valid DB password, the sequence is:
  `npm run db:generate-seed && npm run db:migrate && npm run db:verify`.
- App functionality is unaffected in local mode. Cloud mode works for
  accounts and stored data; only exercise browse content is stale.

## Email confirmation state

`mailer_autoconfirm: true` is set on the project. Signup works instantly
without an email link for development. **Not production-safe**. Before any
real users: disable autoconfirm and wire a real SMTP provider (Resend,
Postmark, or SendGrid). Verified via `GET /auth/v1/settings`.

## Known limitations carried forward

- React Hook Form `watch()` triggers one harmless ESLint warning
  (unfixable without leaving RHF).
- `supabase/scripts/verify.ts` uses `.com` test accounts created via the
  service role; auth flows beyond signup/login/authorization (password reset,
  OAuth redirect) not exercised end-to-end.
- Direct-pg path (`SUPABASE_DB_URL`) is the only feature that needs a DB
  password. Everything else works on the publishable/secret key pair.

## Next phases (not started, awaiting user spec)

- Message 3 spec (user-defined) — not received yet.
- Production readiness checklist: SMTP wiring, autoconfirm off, full seed
  application, regenerating this report after seed lands.
