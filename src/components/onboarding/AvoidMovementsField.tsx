'use client';

import { useState } from 'react';

import { Button, Input } from '@/components/ui';
import { MOVEMENT_SUGGESTIONS } from '@/lib/onboarding/steps';
import { cn } from '@/lib/ui/cn';
import { X } from 'lucide-react';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  /** Keyed field name so React Hook Form can surface per-item errors. */
  name?: string;
};

/**
 * Free-text list of movements to avoid, with quick-add suggestions. Values are
 * normalised on the way in so "Jumping" and "jumping" never both end up stored.
 */
export const AvoidMovementsField = ({ value, onChange, name = 'movementsToAvoid' }: Props) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const cleaned = raw.trim().toLowerCase();
    if (cleaned.length === 0) return;
    if (value.includes(cleaned)) {
      setDraft('');
      return;
    }
    onChange([...value, cleaned]);
    setDraft('');
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  const suggestions = MOVEMENT_SUGGESTIONS.filter((s) => !value.includes(s));

  return (
    <div className="space-y-3.5">
      <div>
        <div className="flex gap-2">
          <Input
            id="avoid-draft"
            label="Movements to avoid"
            name={`${name}Draft`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                // Enter adds a chip rather than submitting the step.
                event.preventDefault();
                add(draft);
              }
            }}
            placeholder="e.g. jumping"
            maxLength={40}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => add(draft)}
            disabled={draft.trim().length === 0}
          >
            Add
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Press Enter to add. Comma separated is not needed.
        </p>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((item) => (
            <li key={item}>
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-line bg-surface py-1 pl-2.5 pr-1.5 text-xs font-medium text-fg">
                {item}
                <button
                  type="button"
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item}`}
                  className="rounded-sm p-0.5 text-muted transition-colors hover:text-red-400 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {suggestions.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Common answers
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => add(suggestion)}
                className={cn(
                  'rounded-sm border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted',
                  'transition-colors hover:border-accent/50 hover:text-fg',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                )}
              >
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
