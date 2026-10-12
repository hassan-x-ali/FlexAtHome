import { type HTMLAttributes, type ReactNode } from 'react';

type Tone = 'neutral' | 'accent' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, string> = {
  neutral: 'border-line bg-card text-muted',
  accent: 'border-accent/35 bg-accent/10 text-accent',
  warning: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/35 bg-red-500/10 text-red-400',
  info: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
};

export const Badge = ({
  tone = 'neutral',
  className = '',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    {...rest}
  />
);

/** A small label above a value, used across stats and detail headers. */
export const StatLabel = ({ children }: { children: ReactNode }) => (
  <span className="text-eyebrow">{children}</span>
);

/** Large, tabular-figure number. The app's headline stat treatment. */
export const StatValue = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span className={`font-stats text-2xl font-bold leading-none text-fg ${className}`}>
    {children}
  </span>
);
