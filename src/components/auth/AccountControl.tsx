'use client';

import { LogIn, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Sign-in link, or the signed-in email with a sign-out button.
 *
 * Renders nothing in local mode: there are no accounts, so offering a sign-in
 * link would be a dead control. Returns null rather than hiding with CSS so it
 * never occupies a slot or becomes a focus stop.
 */
export const AccountControl = () => {
  const router = useRouter();
  const { user, enabled, loading, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!enabled || loading) return null;

  if (!user) {
    return (
      <Link
        href="/auth/sign-in"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-fg"
      >
        <LogIn className="size-4 shrink-0" aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  return (
    <div className="border-t border-line p-3">
      <p className="truncate px-3 pb-2 text-xs text-muted" title={user.email}>
        {user.email}
      </p>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          await signOut();
          // replace, not push: signing out should not leave the app in history.
          router.replace('/');
          router.refresh();
        }}
        disabled={busy}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card hover:text-fg disabled:opacity-50"
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
};
