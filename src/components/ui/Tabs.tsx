'use client';

import { useId } from 'react';

export type TabItem<T extends string> = {
  value: T;
  label: string;
  /** Optional count badge. */
  count?: number;
};

/**
 * Tabs follow the ARIA authoring practice: a `tablist` of `tab`s controlling a
 * single `tabpanel`. Arrow keys move between tabs and Home/End jump to the ends;
 * activation is manual so a user tabbing past a tab does not trigger a request.
 */
export const Tabs = <T extends string>({
  items,
  value,
  onChange,
  label,
  children,
}: {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  children: React.ReactNode;
}) => {
  const baseId = useId();

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.value === value);
    if (index === -1) return;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = items[nextIndex];
    if (next) {
      onChange(next.value);
      document.getElementById(`${baseId}-tab-${next.value}`)?.focus();
    }
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <button
              key={item.value}
              id={`${baseId}-tab-${item.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {item.label}
              {typeof item.count === 'number' ? (
                <span className="ml-1.5 font-stats text-xs text-muted">{item.count}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-panel-${value}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${value}`}
        tabIndex={0}
        className="pt-4 focus-visible:outline-2 focus-visible:outline-accent"
      >
        {children}
      </div>
    </div>
  );
};
