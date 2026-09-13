/**
 * offline-fallback.ts — Shared two-tier offline fallback for NavigationRoute.
 *
 * Called when the precache has no match for the requested URL AND the network
 * is unreachable. Decides which offline page to serve based on whether the
 * app shell itself is cached.
 *
 * Tier 1 — specific page not cached, app shell IS cached:
 *   → /offline-page.html — "This page isn't cached yet, taking you home…"
 *   The page auto-redirects to / after a countdown.
 *
 * Tier 2 — app shell NOT cached (fresh device or cache wiped):
 *   → /offline-no-cache.html — "App not available offline, connect to load."
 *   No redirect is possible.
 *
 * Tier 3 — absolute last resort (offline-no-cache.html itself not cached):
 *   → Plain 503 text response. Should never happen in practice.
 *
 * Import this in each app's sw.ts:
 *   import { offlineFallbackResponse } from '@platform/serwist/offline-fallback'
 */

import type { CacheFirst } from 'serwist'

export async function offlineFallbackResponse(_precacheStrategy: CacheFirst): Promise<Response> {
  // Tier 1 — app shell is cached: user can still use the app from home.
  const shellCached = await caches.match('/')
  if (shellCached) {
    const page = await caches.match('/offline-page.html')
    if (page) return page
    // offline-page.html not yet cached — fall through to tier 2
  }

  // Tier 2 — app shell not cached: no offline use possible.
  const noCachePage = await caches.match('/offline-no-cache.html')
  if (noCachePage) return noCachePage

  // Tier 3 — absolute last resort.
  return new Response('App is not available offline. Please connect to the internet.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' },
  })
}
