import type { Metadata } from 'next';

import { AuthProvider } from '@/lib/auth/AuthProvider';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FlexAt Home — Equipment-free workouts, anywhere',
    template: '%s · FlexAt Home',
  },
  description:
    'A home workout app that needs no equipment. Bodyweight training, structured plans, and progress tracking that work offline.',
  openGraph: {
    title: 'FlexAt Home',
    description: 'Equipment-free workouts, anywhere. No gym, no gear, no excuses.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        {/* Auth state is needed on the landing page, the app shell, and the auth
            screens, so the provider sits at the root. It renders children
            immediately and resolves the session in an effect, so server HTML is
            never withheld. */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
