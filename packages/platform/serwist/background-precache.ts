/**
 * background-precache.ts — Shared lazy precache runner + SW activate cleanup.
 *
 * Handles two concerns that are identical across every app:
 *
 * 1. backgroundPrecacheRest() — caches all JS/CSS files listed in
 *    self.__SW_LAZY_MANIFEST in small batches after the page has loaded,
 *    so the initial install stays fast. Writes a completion marker only
 *    when every file is verified present — partial runs leave no marker
 *    so the next trigger retries missing files.
 *
 * 2. registerActivateCleanup() — on SW activate, deletes lazy-precache-*
 *    caches from prior deployments so stale assets don't accumulate.
 *
 * 3. registerMessageListener() — wires up the 'start-lazy-precache' and
 *    'retry-lazy-precache' client messages that trigger backgroundPrecacheRest.
 *
 * Import in each app's sw.ts:
 *   import { registerActivateCleanup, registerMessageListener }
 *     from '@platform/serwist/background-precache'
 */

declare const self: ServiceWorkerGlobalScope & {
  __SW_LAZY_MANIFEST?: (string | { url: string })[]
}

// Configuration — kept identical to the original web app values.
const LAZY_BATCH_SIZE = 6
const LAZY_BATCH_DELAY_MS = 400
const COMPLETE_MARKER_PREFIX = '/__lazy_precache_complete__'

// Prevents overlapping runs when, e.g., 'online' event and a client message
// both fire close together.
let precacheInFlight = false

/**
 * Background lazy precache.
 *
 * @param lazyCacheName  The versioned cache name, e.g. `lazy-precache-${BUILD_ID}`.
 *                       Must be unique per build so stale entries are auto-swept.
 * @param isProd         Pass true only in production — no-ops in dev.
 */
export async function backgroundPrecacheRest(lazyCacheName: string, isProd: boolean): Promise<void> {
  if (!isProd) return
  if (precacheInFlight) return
  precacheInFlight = true

  try {
    const manifest = self.__SW_LAZY_MANIFEST ?? []
    if (manifest.length === 0) return

    const cache = await caches.open(lazyCacheName)

    // Already fully completed for this build — instant no-op.
    if (await cache.match(COMPLETE_MARKER_PREFIX)) return

    const urls = manifest.map(entry => (typeof entry === 'string' ? entry : entry.url))

    for (let i = 0; i < urls.length; i += LAZY_BATCH_SIZE) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.info('[SW] Lazy precache paused — offline. Will resume on next trigger.')
        return // no marker written — next trigger retries remaining files
      }

      const batch = urls.slice(i, i + LAZY_BATCH_SIZE)

      await Promise.all(
        batch.map(async url => {
          if (await cache.match(url)) return // already cached — idempotent
          try {
            const response = await fetch(url, { cache: 'no-cache' })
            if (response.ok) await cache.put(url, response)
          } catch {
            // network error — leave uncached, verification pass below catches it
          }
        }),
      )

      await new Promise(resolve => setTimeout(resolve, LAZY_BATCH_DELAY_MS))
    }

    // Verification pass: only write completion marker when EVERY file is present.
    const missing: string[] = []
    for (const url of urls) {
      if (!(await cache.match(url))) missing.push(url)
    }
    if (missing.length > 0) {
      console.info(`[SW] Lazy precache incomplete — ${missing.length} file(s) still missing. Will retry on next trigger.`)
      return
    }

    await cache.put(COMPLETE_MARKER_PREFIX, new Response('done'))
    console.info('[SW] Lazy precache complete for cache', lazyCacheName)
  } finally {
    precacheInFlight = false
  }
}

/**
 * Register the SW activate handler that sweeps stale lazy-precache-* caches
 * from prior deployments. Call once at SW module level.
 *
 * @param currentLazyCacheName  The cache name for the current build.
 */
export function registerActivateCleanup(currentLazyCacheName: string): void {
  self.addEventListener('activate', event => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(
          keys
            .filter(key => key.startsWith('lazy-precache-') && key !== currentLazyCacheName)
            .map(key => caches.delete(key)),
        )
      })(),
    )
  })
}

/**
 * Register the message listener that clients use to trigger lazy precaching.
 * Responds to 'start-lazy-precache' and 'retry-lazy-precache' messages.
 * Call once at SW module level.
 *
 * @param lazyCacheName  The versioned cache name for this build.
 * @param isProd         Pass true only in production.
 */
export function registerMessageListener(lazyCacheName: string, isProd: boolean): void {
  self.addEventListener('message', event => {
    if (event.data === 'start-lazy-precache' || event.data === 'retry-lazy-precache') {
      event.waitUntil(backgroundPrecacheRest(lazyCacheName, isProd))
    }
  })
}
