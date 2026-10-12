'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, KeyRound, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Card, CardBody, Input } from '@/components/ui';
import { emailSchema, passwordSchema } from '@/lib/domain/validation';
import { getBackend } from '@/lib/storage';

/** Supabase's recovery link lands here; the client picks the session up from the URL. */
const recoveryFormSchema = z
  .object({ password: passwordSchema, confirm: z.string().min(1, 'Confirm your new password') })
  .refine((v) => v.password === v.confirm, {
    message: 'Those passwords do not match',
    path: ['confirm'],
  });

const requestFormSchema = z.object({ email: emailSchema });
type RequestValues = z.infer<typeof requestFormSchema>;
type RecoveryValues = z.infer<typeof recoveryFormSchema>;

/**
 * Password reset, in three states on one route:
 *
 *  - default: ask for an email and send a reset link
 *  - `?reason=recovery`: a valid recovery link arrived, so offer the new-password
 *    form once the client has established a session from the URL token
 *  - after a successful change: confirm and send them to sign in
 */
export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/schedule';

  // The emailed link carries tokens in the URL fragment. Supabase's client reads
  // them and fires a session event, so listen for that rather than parsing.
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);

  useEffect(() => {
    const { auth } = getBackend();
    let cancelled = false;

    const unsubscribe = auth.onAuthStateChange((user) => {
      if (cancelled) return;
      setHasRecoverySession(user !== null);
      setCheckedSession(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const [linkSent, setLinkSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const requestForm = useForm<RequestValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const recoveryForm = useForm<RecoveryValues>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: { password: '', confirm: '' },
    mode: 'onTouched',
  });

  const onRequest = requestForm.handleSubmit(async ({ email }) => {
    setRequestError(null);
    const { error } = await getBackend().auth.requestPasswordReset(email);
    if (error) {
      setRequestError(error.message);
      return;
    }
    setLinkSent(true);
  });

  const onRecovery = recoveryForm.handleSubmit(async ({ password }) => {
    setRecoveryError(null);
    const { error } = await getBackend().auth.updatePassword(password);
    if (error) {
      setRecoveryError(error.message);
      return;
    }
    setChanged(true);
  });

  // --- Recovery link that did not establish a session ------------------
  if (reason === 'recovery' && checkedSession && !hasRecoverySession) {
    return (
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <h1 className="text-xl sm:text-2xl">That link has expired</h1>
          <p role="alert" className="flex items-start gap-2 text-sm text-muted">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Reset links are single-use and time-limited. Request a new one and it will work.
          </p>
          <Link
            href="/auth/reset-password"
            className="inline-block text-sm text-accent underline-offset-2 hover:underline"
          >
            Request a new link
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (reason === 'recovery' && hasRecoverySession) {
    if (changed) {
      return (
        <Card className="w-full max-w-md">
          <CardBody className="space-y-4">
            <h1 className="flex items-center gap-2 text-xl sm:text-2xl">
              <ShieldCheck className="size-5 text-accent" aria-hidden="true" />
              Password updated
            </h1>
            <p className="text-sm text-muted">
              Your new password is active. Sign in to pick up your week.
            </p>
            <Button block onClick={() => router.replace('/auth/sign-in')}>
              Go to sign in
            </Button>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card className="w-full max-w-md">
        <CardBody className="space-y-5">
          <div>
            <h1 className="text-xl sm:text-2xl">Choose a new password</h1>
            <p className="mt-1.5 text-sm text-muted">
              Pick something you have not used here before.
            </p>
          </div>
          <form onSubmit={onRecovery} noValidate className="space-y-4">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters, with a letter and a number or symbol."
              error={recoveryForm.formState.errors.password?.message}
              {...recoveryForm.register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={recoveryForm.formState.errors.confirm?.message}
              {...recoveryForm.register('confirm')}
            />
            {recoveryError ? (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {recoveryError}
              </p>
            ) : null}
            <Button type="submit" block disabled={recoveryForm.formState.isSubmitting}>
              <KeyRound className="size-4" aria-hidden="true" />
              {recoveryForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardBody>
      </Card>
    );
  }

  // --- Default: request a link ------------------------------------------
  return (
    <Card className="w-full max-w-md">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl">Reset your password</h1>
          <p className="mt-1.5 text-sm text-muted">
            We will email you a link to choose a new one.
          </p>
        </div>

        {linkSent ? (
          <div className="space-y-4">
            <p role="status" className="flex items-start gap-2 text-sm text-accent">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              If that address has an account, a reset link is on its way. Check your spam folder
              if it has not arrived in a few minutes.
            </p>
            <Link
              href="/auth/sign-in"
              className="inline-block text-sm text-accent underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onRequest} noValidate className="space-y-4">
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={requestForm.formState.errors.email?.message}
              {...requestForm.register('email')}
            />
            {requestError ? (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {requestError}
              </p>
            ) : null}
            <Button type="submit" block disabled={requestForm.formState.isSubmitting}>
              <KeyRound className="size-4" aria-hidden="true" />
              {requestForm.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <p className="text-sm text-muted">
              <Link
                href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </CardBody>
    </Card>
  );
};
