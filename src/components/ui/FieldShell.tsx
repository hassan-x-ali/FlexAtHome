'use client';

import { type ReactNode } from 'react';

export const FieldShell = ({ children }: { children: ReactNode }) => (
  <div className="w-full">{children}</div>
);

export const FieldLabel = ({
  children,
  htmlFor,
  className = '',
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) => (
  <label htmlFor={htmlFor} className={`mb-1.5 block text-sm font-medium text-fg ${className}`}>
    {children}
  </label>
);

export const FieldError = ({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) => (
  <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-400">
    {children}
  </p>
);

export const Fieldset = ({
  children,
  legend,
  description,
}: {
  children: ReactNode;
  legend: string;
  description?: string;
}) => (
  <fieldset className="w-full">
    <legend className="mb-1.5 text-sm font-medium text-fg">{legend}</legend>
    {description ? <p className="mb-2.5 text-xs text-muted">{description}</p> : null}
    {children}
  </fieldset>
);
