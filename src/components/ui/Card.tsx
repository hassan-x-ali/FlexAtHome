import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';

type Props = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
  /** Removes the default padding, for edge-to-edge cards. */
  flush?: boolean;
};

export const Card = ({ as: Tag = 'div', flush, className = '', children, ...rest }: Props) => (
  <Tag
    className={`rounded-lg border border-line bg-card ${flush ? '' : 'p-5'} ${className}`}
    {...rest}
  >
    {children}
  </Tag>
);

export const CardHeader = ({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mb-4 flex items-start justify-between gap-3 ${className}`} {...rest} />
);

export const CardTitle = ({ className = '', ...rest }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={`text-base font-bold tracking-tight ${className}`} {...rest} />
);

export const CardBody = ({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...rest} />
);

export const CardFooter = ({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-5 flex items-center gap-3 ${className}`} {...rest} />
);
