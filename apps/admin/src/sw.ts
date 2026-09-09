import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { NetworkOnly, Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Admin app — online-only, no offline or lazy precache needed.
const serwist = new Serwist({
  disableDevLogs: true,
  precacheEntries: [],
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [{ matcher: () => true, handler: new NetworkOnly() }],
})

serwist.addEventListeners()
