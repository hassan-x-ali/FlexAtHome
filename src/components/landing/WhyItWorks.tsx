import { WHY } from '@/lib/landing/content';

export const WhyItWorks = () => (
  <section id="why" aria-labelledby="why-heading" className="border-b border-line py-16 md:py-20">
    <div className="container-page">
      <h2 id="why-heading" className="text-2xl sm:text-3xl">
        Why it works
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        Three constraints shape everything here: no equipment, limited time, and a body that needs
        to get stronger gradually. The app is built around them rather than despite them.
      </p>
      <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WHY.map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-lg border border-line bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-md border border-line bg-surface">
              <Icon className="size-4 text-accent" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-base font-bold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
