import { SAMPLE_WEEK } from '@/lib/landing/content';

const totalMinutes = SAMPLE_WEEK.reduce((sum, day) => sum + day.minutes, 0);

export const SampleWeek = () => (
  <section id="week" aria-labelledby="week-heading" className="border-b border-line py-16 md:py-20">
    <div className="container-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="week-heading" className="text-2xl sm:text-3xl">
            A sample week
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Four training days, two rest days, and short mobility work. This is what a typical
            beginner plan looks like — yours is built from your own answers, not copied from this.
          </p>
        </div>
        <p className="font-stats text-sm text-muted">
          <span className="text-2xl font-bold text-fg">{totalMinutes}</span> min total
        </p>
      </div>

      <ol className="mt-9 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_WEEK.map((day) => {
          const isRest = day.minutes === 0;
          return (
            <li
              key={day.day}
              className={`rounded-lg border p-4 ${
                isRest ? 'border-line bg-card/40' : 'border-line bg-card'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold">{day.day}</h3>
                <span
                  className={`font-stats text-xs font-semibold ${
                    isRest ? 'text-muted' : 'text-accent'
                  }`}
                >
                  {isRest ? 'Rest' : `${day.minutes} min`}
                </span>
              </div>
              <p className={`mt-1.5 text-sm font-medium ${isRest ? 'text-muted' : 'text-fg'}`}>
                {day.focus}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{day.detail}</p>
            </li>
          );
        })}
      </ol>
    </div>
  </section>
);
