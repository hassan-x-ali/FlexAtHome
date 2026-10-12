/** Small class-name joiner. Falsy values are dropped. */
export const cn = (...values: (string | false | null | undefined)[]): string =>
  values.filter(Boolean).join(' ');
