import Link from 'next/link';
import { type ComponentProps } from 'react';

import { type ButtonVariants, buttonVariants } from '@/lib/ui/variants';

type Props = ComponentProps<typeof Link> & ButtonVariants;

/** Anchor styled as a button, for real navigations. */
export const ButtonLink = ({ className, variant, size, block, ...rest }: Props) => (
  <Link className={buttonVariants({ variant, size, block, className })} {...rest} />
);
