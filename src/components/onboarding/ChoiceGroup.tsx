'use client';

import { Check } from 'lucide-react';

import { cn } from '@/lib/ui/cn';

export type ChoiceOption = {
  value: string;
  label: string;
  detail?: string;
};

type Props = {
  name: string;
  legend: string;
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  /** Renders as radio inputs rather than checkboxes, for single choice. */
  multiple?: boolean;
  columns?: 1 | 2;
};

/**
 * A radio group styled as selectable cards. Implemented with real `<input
 * type="radio">` elements so arrow-key navigation, grouping, and the announced
 * label all behave natively.
 */
export const ChoiceGroup = ({
  name,
  legend,
  options,
  value,
  onChange,
  multiple = false,
  columns = 1,
}: Props) => {
  const selected = multiple ? (value ?? '').split(',').filter(Boolean) : value ? [value] : [];

  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-fg">{legend}</legend>
      <div className={cn(columns === 2 && 'grid gap-2.5 sm:grid-cols-2')}>
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent',
                isSelected
                  ? 'border-accent bg-accent/10'
                  : 'border-line bg-surface hover:border-muted',
              )}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
                  multiple ? 'rounded-sm' : 'rounded-full',
                  isSelected ? 'border-accent bg-accent' : 'border-muted bg-transparent',
                )}
              >
                {isSelected ? (
                  multiple ? (
                    <Check className="size-3 text-bg" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-bg" />
                  )
                ) : null}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    isSelected ? 'text-accent' : 'text-fg',
                  )}
                >
                  {option.label}
                </span>
                {option.detail ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {option.detail}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};
