import type { HTMLAttributes } from 'react';

const widths = {
  sm: 'h-3 w-full',
  md: 'h-4 w-full',
  lg: 'h-6 w-full',
  text: 'h-4 w-2/5',
} as const;

type Props = HTMLAttributes<HTMLDivElement> & {
  size?: keyof typeof widths;
  /** Repeating skeleton lines, e.g. [1, 0.6, 0.8]. */
  lines?: number[];
};

export const Skeleton = ({ size = 'md', lines, className = '', ...rest }: Props) => {
  if (lines && lines.length > 0) {
    return (
      <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true" {...rest}>
        {lines.map((fraction, index) => (
          <div
            key={index}
            className="h-4 animate-pulse rounded-sm bg-card"
            style={{ width: `${Math.round(fraction * 100)}%` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`animate-pulse rounded-sm bg-card ${widths[size]} ${className}`}
      aria-hidden="true"
      {...rest}
    />
  );
};

/** Wraps a skeleton group with the correct busy semantics for a region. */
export const SkeletonGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div role="status" aria-busy="true" aria-label={label}>
    <span className="sr-only">{label}</span>
    {children}
  </div>
);
