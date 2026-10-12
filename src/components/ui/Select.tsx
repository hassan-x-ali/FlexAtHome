'use client';

import { ChevronDown } from 'lucide-react';
import { type SelectHTMLAttributes, forwardRef, useId } from 'react';

import { FieldError, FieldLabel, FieldShell } from './FieldShell';

export type SelectOption = {
  value: string;
  label: string;
};

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string | undefined;
  placeholder?: string;
};

const base =
  'w-full appearance-none rounded-md border bg-surface px-3 pr-10 text-fg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, options, hint, error, placeholder, className = '', id, ...rest },
  ref,
) {
  const generated = useId();
  const selectId = id ?? generated;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <FieldShell>
      <FieldLabel htmlFor={selectId}>{label}</FieldLabel>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${base} h-11 ${error ? 'border-red-500' : 'border-line'} ${className}`}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
      </div>
      {error ? <FieldError id={`${selectId}-error`}>{error}</FieldError> : null}
      {!error && hint ? (
        <p id={`${selectId}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </FieldShell>
  );
});
