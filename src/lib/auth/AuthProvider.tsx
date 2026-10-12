'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getBackend } from '@/lib/storage';
// Imported from config, not session: session.ts reaches next/headers and
// cannot be pulled into a client bundle.
import { cloudAuthEnabled } from '@/lib/auth/config';
import type { AuthUser } from '@/lib/storage/types';

export type AuthState = {
  /** Null while loading, and in local mode. */
  user: AuthUser | null;
  /** True until the first auth read settles. */
  loading: boolean;
  /** False in local mode: there are no accounts to sign in to. */
  enabled: boolean;
  signOut: () => Promise<void>;
  /** Re-reads the session. Call after a flow that may have changed it. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Client-side auth state, shared across the app.
 *
 * The session is read through the storage adapter, so this component never
 * touches Supabase directly. Subscribing to `onAuthStateChange` keeps the user
 * in sync across tabs and catches token refreshes without a reload.
 *
 * In local mode there is exactly one implicit user and no accounts, so `enabled`
 * is false and the auth UI stays hidden rather than offering a form that cannot
 * work.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const enabled = cloudAuthEnabled();
  const [user, setUser] = useState<AuthUser | null>(null);
  // Only meaningful when accounts exist. In local mode there is nothing to
  // wait for, so this stays false and never triggers a setState in an effect.
  const [resolving, setResolving] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setResolving(true);
    try {
      setUser(await getBackend().auth.getUser());
    } catch {
      setUser(null);
    } finally {
      setResolving(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // Deferred so the first paint is not blocked on a network round trip.
    const timer = setTimeout(() => void refresh(), 0);
    // Keeps the session current on cross-tab sign-in and silent token refresh.
    const unsubscribe = getBackend().auth.onAuthStateChange((next) => {
      setUser(next);
      setResolving(false);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, refresh]);

  const signOut = useCallback(async () => {
    await getBackend().auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading: enabled && resolving, enabled, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthState => {
  const value = useContext(AuthContext);
  // Falling back keeps this safe if a page renders outside the provider.
  return (
    value ?? {
      user: null,
      loading: false,
      enabled: false,
      signOut: async () => undefined,
      refresh: async () => undefined,
    }
  );
};
