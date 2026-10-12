'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { type ButtonVariants, buttonVariants } from '@/lib/ui/variants';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariants;

/**
 * A real `<button>` by default. `asChild` is deliberately not offered: if a
 * control navigates, use a `<Link>` styled with `buttonVariants` instead, so
 * keyboard and screen-reader semantics stay correct.
 */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant, size, block, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, block, className })}
      {...rest}
    />
  );
});
