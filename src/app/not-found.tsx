import Link from 'next/link';

import { buttonVariants } from '@/lib/ui/variants';

/**
 * Root 404.
 *
 * Without this file Next falls back to its built-in "This page could not be
 * found" page, which is unstyled and sits outside the app's navigation — a user
 * who mistypes a URL or follows a stale link would be stranded with no way back
 * into the app. This is a Server Component, so it adds no client JavaScript.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <p className="font-stats text-eyebrow text-accent">404</p>
          <h1 className="mt-2 text-2xl sm:text-3xl">That page is not here</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The link may be old, or the address may have a typo in it. Nothing is lost — your plan
            and progress are still saved.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link href="/" className={buttonVariants({ block: true })}>
              Back to dashboard
            </Link>
            <Link href="/exercises" className={buttonVariants({ variant: 'secondary', block: true })}>
              Browse exercises
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
