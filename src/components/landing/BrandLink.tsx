import Link from 'next/link';

/** Shared wordmark. An `<a>` on the landing page, a `<Link>` in the app shell. */
export const BrandLink = ({
  href,
  as = 'a',
  className = '',
}: {
  href: string;
  as?: 'a' | 'link';
  className?: string;
}) => {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-sm bg-accent text-sm font-black text-bg"
      >
        F
      </span>
      <span className="text-base font-bold tracking-tight">
        FlexAt<span className="text-accent">Home</span>
      </span>
    </>
  );

  const classes = `flex items-center gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-accent ${className}`;

  if (as === 'link') {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} className={classes}>
      {content}
    </a>
  );
};
