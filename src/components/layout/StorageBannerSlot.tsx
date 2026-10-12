'use client';

import { ClientOnly } from '@/components/layout/ClientOnly';
import { StorageModeBanner } from '@/components/layout/StorageModeBanner';

/**
 * Mounts the storage-mode notice in place, inside the server-rendered shell.
 *
 * The banner reads the browser storage backend, which does not exist during
 * prerender, so it is deferred to after mount. It is imported and rendered
 * here rather than being passed in as an element, because a Server Component
 * element cannot cross into a Client Component as a prop.
 */
export const StorageBannerSlot = () => (
  <ClientOnly fallback={null}>
    <StorageModeBanner />
  </ClientOnly>
);
