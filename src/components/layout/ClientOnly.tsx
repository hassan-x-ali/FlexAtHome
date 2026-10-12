'use client';

import { type ReactNode, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => undefined;

/**
 * Renders children only after mount.
 *
 * Used for browser-only values that cannot exist during prerender. Children
 * must be plain client-rendered content, not a Server Component element.
 */
export const ClientOnly = ({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) => {
  // `useSyncExternalStore` with a never-firing subscription reports mount state
  // without an effect and without a cascading render.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return <>{mounted ? children : fallback}</>;
};
