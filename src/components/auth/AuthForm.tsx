'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, LogIn, Mail, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, Card, CardBody, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authCredentialsSchema, signInSchema } from '@/lib/domain/validation';
import { getBackend, StorageError } from '@/lib/storage';

type Mode = 'sign-in' | 'sign-up';

/** Sign-in accepts any non-empty password; sign-up enforces strength. */
const schemaFor = (mode: Mode) => (mode === 'sign-in' ? signInSchema : authCredentialsSchema);

type Values = z.infer<typeof signInSchema>;

/**
 * Combined sign-in / sign-up form.
 *
 * Validation is client-side Zod; the authoritative checks are the adapter and
 * RLS, and their errors are surfaced verbatim because they are already written
 * to be actionable ("that email is already registered", "confirm your email").
 */
export const AuthForm = ({ mode }: { mode: Mode }) => {
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Only same-origin paths, matching the callback route's own check.
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/schedule';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schemaFor(mode)),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setNotice(null);
    const { auth } = getBackend();

    // Both results are discriminated unions, so narrow on `error` before
    // reading the success fields.
    if (mode === 'sign-up') {
      const result = await auth.signUp({ email: values.email, password: values.password });
      if ('error' in result) {
        setFormError(result.error.message);
        return;
      }
      if (result.needsEmailConfirmation) {
        // A session does not exist yet, so the app cannot be entered. Say so
        // plainly rather than redirecting into a signed-out app.
        setNotice('Check your inbox to confirm your email, then sign in.');
        return;
      }
    } else {
      const result = await auth.signIn({ email: values.email, password: values.password });
      if ('error' in result) {
        setFormError(result.error.message);
        return;
      }
    }

    await refresh();
    // A hard navigation, deliberately: the session cookie just changed, and
    // middleware must re-run so protected routes stop redirecting. A client
    // push would not re-evaluate it.
    window.location.assign(next);
  });

  const onGoogle = async () => {
    setFormError(null);
    setGoogleBusy(true);
    try {
      const result = await getBackend().auth.signInWithGoogle();
      // A successful call means the browser is navigating away to Google, so
      // there is nothing to do. Only surface a real failure.
      if ('error' in result && result.error) setFormError(result.error.message);
    } catch (caught) {
      setFormError(caught instanceof StorageError ? caught.message : 'Google sign-in failed.');
      setGoogleBusy(false);
    }
  };

  const isSignUp = mode === 'sign-up';

  return (
    <Card className="w-full max-w-md">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl">{isSignUp ? 'Create your account' : 'Sign in'}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {isSignUp
              ? 'Save your plan and progress across devices.'
              : 'Welcome back. Sign in to pick up your week.'}
          </p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Input
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            error={errors.password?.message}
            {...(isSignUp ? { hint: 'At least 8 characters, with a letter and a number or symbol.' } : {})}
            {...register('password')}
          />

          {formError ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {formError}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="flex items-start gap-2 text-sm text-accent">
              <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          ) : null}

          <Button type="submit" block disabled={isSubmitting || googleBusy}>
            {isSignUp ? (
              <UserPlus className="size-4" aria-hidden="true" />
            ) : (
              <LogIn className="size-4" aria-hidden="true" />
            )}
            {isSubmitting ? 'Working…' : isSignUp ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button
            type="button"
            variant="secondary"
            block
            onClick={onGoogle}
            disabled={isSubmitting || googleBusy}
          >
            {googleBusy ? 'Opening Google…' : 'Continue with Google'}
          </Button>
        </div>

        <div className="space-y-1.5 border-t border-line pt-4 text-sm">
          {!isSignUp ? (
            <p>
              <Link
                href={`/auth/reset-password?next=${encodeURIComponent(next)}`}
                className="text-accent underline-offset-2 hover:underline"
              >
                Forgot your password?
              </Link>
            </p>
          ) : null}
          <p className="text-muted">
            {isSignUp ? 'Already have an account? ' : 'No account yet? '}
            <Link
              href={
                isSignUp
                  ? `/auth/sign-in?next=${encodeURIComponent(next)}`
                  : `/auth/sign-up?next=${encodeURIComponent(next)}`
              }
              className="text-accent underline-offset-2 hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </Link>
          </p>
        </div>
      </CardBody>
    </Card>
  );
};
