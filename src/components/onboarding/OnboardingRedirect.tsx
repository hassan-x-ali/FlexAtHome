'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useProfileGate } from './FirstRunGate';

/**
 * Sends the user back to the app if onboarding is already complete, so
 * `/onboarding` is genuinely first-run-only and never re-entered by accident.
 */
export const OnboardingRedirect = () => {
  const { profile, loading } = useProfileGate();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (profile?.onboardingCompletedAt) router.replace('/');
  }, [loading, profile, router]);

  return null;
};
