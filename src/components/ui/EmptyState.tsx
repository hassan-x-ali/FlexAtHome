import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

import { Button } from './Button';

type Props = {
  icon?: LucideIcon;
  title: string;
  description: string;
  /** Primary recovery action. Omit for a genuinely empty state. */
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  children?: ReactNode;
  compact?: boolean;
};

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  compact,
}: Props) => (
  <div
    className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-card/40 text-center ${
      compact ? 'gap-3 px-5 py-8' : 'gap-4 px-6 py-14'
    }`}
  >
    {Icon ? (
      <span className="flex size-11 items-center justify-center rounded-md border border-line bg-surface">
        <Icon className="size-5 text-muted" aria-hidden="true" />
      </span>
    ) : null}
    <div className="max-w-sm space-y-1.5">
      <h3 className="text-base font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
    {action || secondaryAction ? (
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
        {action ? (
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button size="sm" variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </div>
    ) : null}
    {children}
  </div>
);
