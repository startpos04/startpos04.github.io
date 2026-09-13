/**
 * sw.ts — Admin app service worker entry point.
 *
 * The Admin Panel is online-only by design — all operations require a live
 * server connection. The SW therefore uses NetworkOnly for everything except
 * navigation requests, which are served from the precache so the shell loads
 * instantly even when the network is briefly unavailable (e.g. the flash that
 * occurs on page refresh).
 *
 * The same two-tier offline fallback from the platform package is used:
 *   - /offline-page.html  → shell cached, specific page not available offline
 *   - /offline-no-cache.html → no cache at all (fresh device or cache wiped)
 *
 * Lazy background precaching (JS/CSS) is enabled so that navigating to any
 * admin page while the cache is warm is instant — even if the network is slow.
 *
 * Shared infrastructure (fallback logic, lazy precache runner, activate
 * cleanup) is imported from packages/platform/serwist so it stays in sync
 * with the web app automatically.
 */

import { registerActivateCleanup, registerMessageListener } from '@platform/serwist/background-precache'
import { offlineFallbackResponse } from '@platform/serwist/offline-fallback'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { CacheFirst, NavigationRoute, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
    __SW_LAZY_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const isProd = typeof process !== 'undefined' ? process.env['NODE_ENV'] === 'production' : import.meta.env?.MODE === 'production'

const BUILD_ID = typeof process !== 'undefined' ? (process.env['BUILD_ID'] ?? 'dev') : 'dev'

const LAZY_CACHE_NAME = `lazy-precache-admin-${BUILD_ID}`

// ---------------------------------------------------------------------------
// Serwist instance
// ---------------------------------------------------------------------------

const serwist = new Serwist({
  disableDevLogs: true,
  precacheEntries: isProd ? (self.__SW_MANIFEST ?? []) : [], // shell only — fast install
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: isProd,
  runtimeCaching: isProd
    ? [
        // NOTE: Navigation is handled by NavigationRoute below — do NOT add a
        // NetworkFirst navigate handler here (causes "site can't be reached" flash).
        {
          matcher: ({ url }) => url.pathname.startsWith('/_serverFn'),
          handler: new NetworkOnly(),
        },
        {
          // Cache admin JS/CSS via StaleWhileRevalidate so pages load fast on
          // repeat visits even on a slow connection.
          matcher: ({ request }) => request.destination === 'script',
          handler: new StaleWhileRevalidate({ cacheName: LAZY_CACHE_NAME }),
        },
        {
          matcher: ({ request }) => request.destination === 'style' || request.destination === 'image' || request.destination === 'font',
          handler: new CacheFirst({ cacheName: 'admin-static-assets' }),
        },
        // All other requests (API calls, etc.) go straight to the network.
        {
          matcher: () => true,
          handler: new NetworkOnly(),
        },
      ]
    : [{ matcher: () => true, handler: new NetworkOnly() }],
})

// ---------------------------------------------------------------------------
// NavigationRoute — same pattern as the web app.
// ---------------------------------------------------------------------------

if (isProd) {
  const precacheStrategy = serwist.precacheStrategy as CacheFirst

  const navigationRoute = new NavigationRoute(
    {
      handle: async options => {
        try {
          return await precacheStrategy.handle(options)
        } catch {
          return offlineFallbackResponse(precacheStrategy)
        }
      },
    },
    {
      allowlist: [/^(?!\/__).*/],
      denylist: [/^\/_serverFn/],
    },
  )

  serwist.registerCapture(navigationRoute)
}

serwist.addEventListeners()

// ---------------------------------------------------------------------------
// Shared background precache + lifecycle hooks (from platform package)
// ---------------------------------------------------------------------------

registerActivateCleanup(LAZY_CACHE_NAME)
registerMessageListener(LAZY_CACHE_NAME, isProd)
