/**
 * sw.ts — Web app service worker entry point.
 *
 * App-specific concerns live here (runtime caching rules, OPFS worker exclusion,
 * lazy precache for JS/CSS). All shared infrastructure is imported from the
 * platform package so it stays in sync with the admin app automatically.
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

const LAZY_CACHE_NAME = `lazy-precache-${BUILD_ID}`

// ---------------------------------------------------------------------------
// Serwist instance
// ---------------------------------------------------------------------------

const serwist = new Serwist({
  disableDevLogs: false,
  precacheEntries: isProd ? (self.__SW_MANIFEST ?? []) : [], // shell only — fast install
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: isProd,
  runtimeCaching: isProd
    ? [
        // NOTE: Navigation requests are handled exclusively by the NavigationRoute
        // registered below (precacheStrategy = CacheFirst). Do NOT add a NetworkFirst
        // handler here for request.mode === 'navigate' — it runs before NavigationRoute,
        // hits the network, and causes a "site can't be reached" flash when offline.
        {
          matcher: ({ url }) => url.host === 'images.unsplash.com',
          handler: new CacheFirst({ cacheName: 'unsplash-images' }),
        },
        {
          matcher: ({ url }) => url.pathname.startsWith('/_serverFn'),
          handler: new NetworkOnly(),
        },
        {
          // Reads the same cache the background precache job fills, so whichever
          // fills a given file first benefits the other.
          matcher: ({ request, url }) => request.destination === 'script' && !url.pathname.includes('opfs-worker'),
          handler: new StaleWhileRevalidate({ cacheName: LAZY_CACHE_NAME }),
        },
        {
          matcher: ({ request }) => request.destination === 'style' || request.destination === 'image' || request.destination === 'font',
          handler: new CacheFirst({ cacheName: 'static-assets' }),
        },
        {
          // OPFS worker is large and only needed once the offline DB initialises —
          // never SW-cached, always fetched fresh on demand.
          matcher: ({ url }) => url.pathname.includes('opfs-worker'),
          handler: new NetworkOnly(),
        },
      ]
    : [{ matcher: () => true, handler: new NetworkOnly() }],
})

// ---------------------------------------------------------------------------
// NavigationRoute — sole handler for all page navigations.
//
// Uses precacheStrategy (CacheFirst) so the app shell is served instantly from
// the precache with zero network round-trip, preventing the "site can't be
// reached" flash that NetworkFirst causes when offline.
//
// On precache miss + network failure the custom handler delegates to the shared
// two-tier offlineFallbackResponse from packages/platform/serwist.
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

// Sweeps stale lazy-precache-* caches from prior deployments on activate.
registerActivateCleanup(LAZY_CACHE_NAME)

// Responds to 'start-lazy-precache' / 'retry-lazy-precache' client messages.
registerMessageListener(LAZY_CACHE_NAME, isProd)
