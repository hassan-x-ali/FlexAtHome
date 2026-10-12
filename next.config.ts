import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The workspace sits inside the home directory, so Turbopack cannot infer
  // the project root and ignores the lockfile without this.
  turbopack: {
    root: __dirname,
  },
  // Typed routes are checked by `npm run typecheck` in CI. Next 16 builds the
  // route manifest too late in its type pass for `Route` to resolve, which
  // fails the build on valid hrefs.
  typedRoutes: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
