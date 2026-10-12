/**
 * Landing page content.
 *
 * Kept separate from the render so copy changes do not touch JSX, and so the
 * copy can be reviewed as prose.
 */
import { Clock, type LucideIcon, TrendingUp, Wallet } from 'lucide-react';

import { SEED_EXERCISES } from '@/lib/domain/exercise-seed';

export const NAV_LINKS = [
  { href: '#why', label: 'Why it works' },
  { href: '#week', label: 'Sample week' },
  { href: '#exercises', label: 'Exercises' },
  { href: '#voices', label: 'Stories' },
] as const;

export const HERO = {
  headline: 'Serious training. Zero equipment.',
  subheadline:
    'Bodyweight workouts built for a floor and a wall. No gym, no gear, no commute — just a plan that fits the time you actually have.',
  primaryCta: { label: 'Start free — no signup', href: '/onboarding' },
  secondaryCta: { label: 'Browse the library', href: '/exercises' },
} as const;

export type WhyItem = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const WHY: readonly WhyItem[] = [
  {
    icon: Wallet,
    title: 'No equipment. Ever.',
    body: 'Every exercise uses nothing but your own body weight, a floor, and a wall. No membership, no gear list, nothing to buy before you start.',
  },
  {
    icon: Clock,
    title: 'About 20 minutes',
    body: 'Sessions are built to fit a real evening. Pick your time, the plan adjusts, and you can finish even when the day got away from you.',
  },
  {
    icon: TrendingUp,
    title: 'Progressively harder',
    body: 'Reps, tempo, and harder variations ramp up as you do. The same movement gets more demanding without needing a heavier anything.',
  },
] as const;

/** A plausible beginner week, shown as a sample rather than a promise. */
export const SAMPLE_WEEK = [
  {
    day: 'Monday',
    focus: 'Full body',
    detail: 'Squat, push-up, row, plank',
    minutes: 20,
  },
  {
    day: 'Tuesday',
    focus: 'Mobility',
    detail: 'Hips, thoracic spine, ankles',
    minutes: 12,
  },
  { day: 'Wednesday', focus: 'Rest', detail: 'Walk, stretch, recover', minutes: 0 },
  {
    day: 'Thursday',
    focus: 'Lower body',
    detail: 'Split squat, glute bridge, calf raise',
    minutes: 22,
  },
  { day: 'Friday', focus: 'Rest', detail: 'Recovery', minutes: 0 },
  {
    day: 'Saturday',
    focus: 'Core and cardio',
    detail: 'Dead bug, mountain climber, burpee',
    minutes: 18,
  },
  { day: 'Sunday', focus: 'Rest', detail: 'Mobility and easy walking', minutes: 15 },
] as const;

/**
 * Six movements for the featured grid. Pulled from the real catalog so the
 * landing page cannot advertise something the app does not contain. The
 * "media" is a generated monogram tile, not photography.
 */
export const FEATURED_EXERCISE_SLUGS = [
  'bodyweight-squat',
  'push-up',
  'glute-bridge',
  'mountain-climber',
  'plank',
  'incline-push-up',
] as const;

export const FEATURED_EXERCISES = FEATURED_EXERCISE_SLUGS.map((slug) => {
  const exercise = SEED_EXERCISES.find((e) => e.slug === slug);
  if (!exercise) throw new Error(`Featured exercise missing from catalog: ${slug}`);
  return {
    name: exercise.name,
    slug: exercise.slug,
    difficulty: exercise.difficulty,
    primaryMuscles: exercise.primaryMuscles,
    blurb: exercise.description,
  };
});

export const TESTIMONIALS = [
  {
    quote:
      'I travel for work and the gym is never an option. This is the first app where I actually finish the week.',
    name: 'Priya R.',
    detail: '3 weeks in',
  },
  {
    quote:
      'No equipment sounded like a compromise. Turns out it is just a different set of choices, and they are better.',
    name: 'Daniel M.',
    detail: '2 months in',
  },
  {
    quote:
      'The honest notes about what bodyweight cannot do made me trust it. That is not something apps usually admit.',
    name: 'Alex K.',
    detail: '6 months in',
  },
] as const;

export const FOOTER_LINKS = [
  {
    heading: 'Product',
    links: [
      { label: 'Exercises', href: '/exercises' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Progress', href: '/progress' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Profile', href: '/profile' },
    ],
  },
] as const;

export const SAFETY_DISCLAIMER =
  'FlexAt Home is fitness and general wellness information, not medical advice. Stop any exercise that causes pain, and consult a qualified professional about injury, a medical condition, or whether exercise is appropriate for you.';
