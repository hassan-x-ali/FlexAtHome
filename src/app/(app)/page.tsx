import type { Metadata } from 'next';

import { Dashboard } from '@/components/home/Dashboard';

export const metadata: Metadata = {
  title: 'Home',
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Dashboard />
    </div>
  );
}
