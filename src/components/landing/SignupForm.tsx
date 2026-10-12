'use client';

import { Check, Mail } from 'lucide-react';
import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui';
import { emailSignupSchema } from '@/lib/domain/validation';
import { getBackend } from '@/lib/storage';

type Values = z.infer<typeof emailSignupSchema>;

/**
 * Landing-page email capture. Deliberately local-only: this is a newsletter
 * list, not an account. It validates with Zod, confirms inline via a live
 * region, and never reloads the page.
 */
export const SignupForm = () => {
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await getBackend().signups.capture(values.email);
      setSavedEmail(values.email.trim().toLowerCase());
      reset();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Could not save that email. Please try again.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="signup-email" className="sr-only">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby="signup-email-feedback"
            className={`h-11 w-full rounded-md border bg-surface px-3 text-sm text-fg placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              errors.email ? 'border-red-500' : 'border-line'
            }`}
            {...register('email')}
          />
        </div>
        <Button type="submit" size="md" disabled={isSubmitting} className="shrink-0">
          <Mail className="size-4" aria-hidden="true" />
          {isSubmitting ? 'Saving…' : 'Get updates'}
        </Button>
      </div>

      <div id="signup-email-feedback" aria-live="polite">
        {errors.email ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-400">
            {errors.email.message}
          </p>
        ) : null}
        {serverError ? (
          <p role="alert" className="mt-2 text-xs font-medium text-red-400">
            {serverError}
          </p>
        ) : null}
        {savedEmail && !errors.email && !serverError ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Check className="size-3.5" aria-hidden="true" />
            You&rsquo;re on the list. Unsubscribe any time.
          </p>
        ) : null}
      </div>
    </form>
  );
};
