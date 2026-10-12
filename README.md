# FlexAt Home

Equipment-free workouts, anywhere. Bodyweight training, structured plans, and progress tracking that work offline.

## Features

- **Zero equipment required** — floor and wall only
- **Three levels** — Beginner, Intermediate, Advanced
- **Six goals** — General fitness, strength, muscle, endurance, weight loss, mobility
- **Structured plans** — weekly schedule, rest days, per-exercise prescription
- **Custom workouts** — create, reorder, per-exercise sets/reps/duration/rest
- **Workout mode** — timed sets, rest timer, progress bar, completion summary
- **Progress tracking** — streak, weekly minutes, per-exercise performance
- **Local-first** — works offline, no account required; optional Supabase cloud sync

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Local mode needs no environment variables. To enable cloud sync:

```bash
# .env.local
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

The DB URL is used only for seed generation (`npm run db:generate-seed`, `npm run db:migrate`, `npm run db:verify`). The app itself uses `SUPABASE_URL` + `SUPABASE_ANON_KEY`.

## Project Structure

```
src/
  app/             Next.js routes
  components/      React components by feature
  lib/
    domain/        Types, validation, exercise catalog
    generator/     Plan generation rules (pure, no storage)
    storage/       StorageAdapter contract, local + Supabase backends
    ui/            Design system primitives
  testing/         Contract, adapter, browser test suites
supabase/          SQL migrations and seed
docs/              Gate reports
```

## Architecture

**StorageAdapter contract.** All features depend on `src/lib/storage/types.ts`. Local (localStorage) and Supabase backends implement the same interface. Features never touch `localStorage` or Supabase directly.

**Pure plan generator.** `src/lib/generator/rules.ts` takes a profile and returns a plan draft. No storage, no React. Exercise selection responds to BOTH level and goal. Time is a budget, not a target.

**Server-first.** Pages are Server Components by default. Client Components only where interaction requires them. All input validated with Zod.

## Testing

```bash
npm run test:adapter      # Storage adapter contract (67 checks)
npm run test:auth         # Auth flows (38 checks)
npm run test:generator    # Plan generator (62 checks)
npm run test:generator:e2e # Generator + storage integration (21 checks)
npm run test:ranking      # Exercise ranking (47 checks)
npm run test:browser      # Playwright E2E (56 checks)
npm run db:verify         # Cloud seed verification (24 checks)
```

## Deployment

1. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in environment
2. Run `npm run db:generate-seed && npm run db:migrate` once
3. Build: `npm run build`
4. Deploy the `.next` output to any static host (Vercel, Netlify)

## Security Notes

- Rotate the Supabase DB password before production
- Configure SMTP and disable `mailer_autoconfirm` before real users
- Never commit `.env.local` or database credentials
