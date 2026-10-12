'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import type { Profile } from '@/lib/domain/types';
import { useAsync } from '@/lib/hooks/useAsync';
import { getBackend } from '@/lib/storage';

export type ProfileGateValue = {
  /** Null while the check is in flight, or when no profile exists. */
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
};

const ProfileGateContext = createContext<ProfileGateValue | null>(null);

/**
 * Resolves the profile once per session and shares it with the app tree.
 *
 * Children render immediately — the gate redirects in an effect rather than by
 * withholding content, so this never blocks server-rendered pages. A storage
 * failure resolves to a null profile rather than throwing.
 */
export const FirstRunGate = ({ children }: { children: ReactNode }) => {
  const router = useRouter();

  // A failed read resolves to null rather than throwing: a storage problem must
  // not make the app unusable.
  const load = useCallback(async (): Promise<Profile | null> => {
    // A failed read resolves to null rather than throwing: a storage problem
    // must not make the app unusable.
    try {
      return await getBackend().profiles.get();
    } catch {
      return null;
    }
  }, []);

  const { data: profile, loading, reload } = useAsync<Profile | null>(load);

  // Re-check on focus, so completing onboarding in another tab is picked up.
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  useEffect(() => {
    if (!loading && profile && !profile.onboardingCompletedAt) {
      router.replace('/onboarding');
    }
  }, [loading, profile, router]);

  return (
    <ProfileGateContext.Provider value={{ profile, loading, refresh: reload }}>
      {children}
    </ProfileGateContext.Provider>
  );
};

/** The resolved profile, or null while loading. Never throws. */
export const useProfileGate = (): ProfileGateValue => {
  const value = useContext(ProfileGateContext);
  return value ?? { profile: null, loading: true, refresh: () => undefined };
};

/** Convenience accessor for components that only need the profile. */
export const useProfile = (): Profile | null => useProfileGate().profile;
