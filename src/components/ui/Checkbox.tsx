'use client';

import { type InputHTMLAttributes, forwardRef, useId } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: string;
  error?: string | undefined;
};

export const Checkbox = forwardRef<HTMLInputElement, Props>(function Checkbox(
  { label, hint, error, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-sm border border-line bg-surface checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          {...rest}
        />
        <label htmlFor={inputId} className="cursor-pointer text-sm text-fg">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 pl-8 text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 pl-8 text-xs font-medium text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
});
