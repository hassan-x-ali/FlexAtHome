/**
 * Shared view-model formatting.
 *
 * Presentation rules live here so pages do not each invent their own date and
 * duration formatting.
 */

export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/** `1:05:09` or `4:09` — used for session timers and logged durations. */
export const formatClock = (totalSeconds: number): string => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

export const formatSeconds = (seconds: number): string =>
  seconds >= 60 ? formatClock(seconds) : `${Math.max(0, Math.round(seconds))}s`;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

export const formatDate = (iso: string): string => DATE_FORMAT.format(new Date(iso));
export const formatDateTime = (iso: string): string => DATE_TIME_FORMAT.format(new Date(iso));
export const formatWeekday = (iso: string): string => WEEKDAY_FORMAT.format(new Date(iso));

/** "Today", "Yesterday", or a short date. */
export const formatRelativeDay = (iso: string): string => {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (dayDiff === 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff > 1 && dayDiff < 7) return formatWeekday(iso);
  return DATE_FORMAT.format(date);
};

/** `0:18` — used for rest timers. */
export const formatRest = (totalSeconds: number): string => formatClock(totalSeconds);

export const pluralise = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** Turns `fire_hydrant` into `Fire Hydrant`. */
export const humanise = (value: string): string =>
  value
    .split('_')
    .map((word) => (word.length <= 2 && word === word.toUpperCase() ? word : word[0]?.toUpperCase() + word.slice(1)))
    .join(' ');
