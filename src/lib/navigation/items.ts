import {
  CalendarDays,
  Dumbbell,
  Flame,
  LayoutDashboard,
  type LucideIcon,
  TrendingUp,
  User,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bar, where labels must stay short. */
  shortLabel: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Home', shortLabel: 'Home', icon: LayoutDashboard },
  { href: '/workout', label: 'Workout', shortLabel: 'Workout', icon: Flame },
  { href: '/schedule', label: 'Schedule', shortLabel: 'Plan', icon: CalendarDays },
  { href: '/exercises', label: 'Exercises', shortLabel: 'Library', icon: Dumbbell },
  { href: '/progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp },
  { href: '/profile', label: 'Profile', shortLabel: 'Profile', icon: User },
] as const;

/** True when `pathname` is `href` or a child route of it. */
export const isActiveRoute = (pathname: string, href: string): boolean => {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
};
