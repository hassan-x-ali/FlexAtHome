'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

import { Button } from './Button';

type Props = {
  title?: string;
  /** A human-readable message. Technical detail belongs in `detail`. */
  message: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
};

/**
 * The standard error presentation. Always explains what happened and, where
 * recovery is possible, offers a real Try Again that calls the caller's reload
 * function. Never a dead end.
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message,
  detail,
  onRetry,
  retryLabel = 'Try again',
  className = '',
  compact,
}: Props) => (
  <div
    role="alert"
    className={`flex flex-col items-start gap-3 rounded-lg border border-red-500/35 bg-red-500/5 ${
      compact ? 'p-4' : 'p-5'
    } ${className}`}
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden="true" />
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-fg">{title}</h3>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
        {detail ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-muted hover:text-fg">
              Technical detail
            </summary>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap rounded-sm border border-line bg-surface p-2 text-xs text-muted">
              {detail}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
    {onRetry ? (
      <Button size="sm" variant="secondary" onClick={onRetry}>
        <RotateCw className="size-3.5" aria-hidden="true" />
        {retryLabel}
      </Button>
    ) : null}
  </div>
);
