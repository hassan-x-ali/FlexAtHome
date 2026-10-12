'use client';

import { Cloud, CloudOff, X } from 'lucide-react';
import { useState } from 'react';

import { cloudStatus } from '@/lib/storage';

const DISMISSED_KEY = 'flexat:notice:local-mode-dismissed';

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * A single, dismissible note explaining that data is local. Shown at most once:
 * the absence of an optional integration is a supported configuration, so it is
 * noted and then left alone rather than shown on every page load.
 */
export const StorageModeBanner = () => {
  const status = cloudStatus();
  // This component is only mounted client-side (see AppClientShell), so
  // localStorage is readable during the initial render.
  const [dismissed, setDismissed] = useState(() =>
    status === 'not-configured' ? readDismissed() : true,
  );

  if (status === 'active') {
    return (
      <p className="flex items-center gap-2 border-b border-line bg-surface/60 px-5 py-2 text-xs text-muted lg:px-8">
        <Cloud className="size-3.5 text-accent" aria-hidden="true" />
        Cloud sync is active.
      </p>
    );
  }

  if (dismissed) return null;

  return (
    <p className="flex items-start gap-2 border-b border-line bg-surface/60 px-5 py-2 text-xs text-muted lg:px-8">
      <CloudOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">
        Saving to this device. Everything works offline — connect Supabase to sync across devices.
      </span>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(DISMISSED_KEY, '1');
          setDismissed(true);
        }}
        aria-label="Dismiss storage notice"
        className="shrink-0 rounded-sm p-0.5 text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </p>
  );
};
