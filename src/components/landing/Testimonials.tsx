import { TESTIMONIALS } from '@/lib/landing/content';

export const Testimonials = () => (
  <section id="voices" aria-labelledby="voices-heading" className="border-b border-line py-16 md:py-20">
    <div className="container-page">
      <h2 id="voices-heading" className="text-2xl sm:text-3xl">
        From people who train at home
      </h2>
      <ul className="mt-9 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <li key={item.name} className="flex flex-col rounded-lg border border-line bg-card p-6">
            <blockquote className="flex-1 text-sm leading-relaxed text-fg">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <footer className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-sm border border-line bg-surface text-xs font-bold text-muted"
              >
                {item.name
                  .split(' ')
                  .map((part) => part[0] ?? '')
                  .join('')}
              </span>
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted">{item.detail}</p>
              </div>
            </footer>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
