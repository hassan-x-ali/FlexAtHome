'use client';

import { type InputHTMLAttributes, forwardRef, useId } from 'react';

import { FieldError, FieldLabel, FieldShell } from './FieldShell';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  /** Shown under the field; paired automatically with `error` via aria. */
  hint?: string;
  error?: string | undefined;
};

const baseInput =
  'w-full rounded-md border bg-surface px-3 text-fg placeholder:text-muted/70 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <FieldShell>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${baseInput} h-11 ${error ? 'border-red-500' : 'border-line'} ${className}`}
        {...rest}
      />
      {error ? <FieldError id={`${inputId}-error`}>{error}</FieldError> : null}
      {!error && hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </FieldShell>
  );
});
