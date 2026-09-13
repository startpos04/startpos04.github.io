/**
 * vite-devtools.ts — Shared TanStack devtools Vite plugin for all StartPOS apps.
 *
 * Wraps @tanstack/devtools-vite so every app gets devtools with zero
 * boilerplate. The plugin is dev-only by design — it self-removes on build
 * (removeDevtoolsOnBuild: true is the upstream default).
 *
 * ## Docker Dev
 *
 * The plugin is ALWAYS enabled, including in Docker. Previously it was
 * disabled in Docker because the `enhancedLogs` feature injects
 * `http://localhost:<port>` into console.log output — using the internal
 * container port (3000), not the host-facing port (3200). Clicking those
 * links from the browser would go to the wrong port.
 *
 * The fix: pass `publicPort` when running in Docker so the plugin uses the
 * host-facing port for log links. The panel itself always works in Docker
 * because it communicates over the normal HTTP path, not a separate socket.
 *
 * Usage in any app's vite.config.ts:
 *
 *   import { tanstackDevtoolsPlugin } from '../../packages/platform/vite-devtools'
 *
 *   plugins: [
 *     ...tanstackDevtoolsPlugin({ publicPort }),   // works in Docker + local dev
 *   ]
 */

import type { TanStackDevtoolsViteConfig } from '@tanstack/devtools-vite'
import { devtools } from '@tanstack/devtools-vite'
import type { Plugin } from 'vite'

export type { TanStackDevtoolsViteConfig }

export interface DevtoolsPluginOptions extends TanStackDevtoolsViteConfig {
  /**
   * The public-facing port the browser uses to reach the dev server.
   * In Docker this differs from the internal Vite port (container port).
   * When provided, enhanced log links use this port so they are clickable
   * from the host browser.
   *
   * Example (docker-compose.yml maps container 3000 → host 3200):
   *   publicPort: 3200   // links become http://localhost:3200/__tsd/open-source?...
   *
   * Omit for local dev (non-Docker) — Vite's own port is used automatically.
   */
  publicPort?: number
}

/**
 * Returns the TanStack devtools plugin array.
 * Always spread into the plugins array:
 *
 *   plugins: [
 *     ...tanstackDevtoolsPlugin(),                          // local dev
 *     ...tanstackDevtoolsPlugin({ publicPort: 3200 }),      // Docker dev
 *   ]
 */
export function tanstackDevtoolsPlugin(opts: DevtoolsPluginOptions = {}): Plugin[] {
  const { publicPort, ...devtoolsConfig } = opts

  // When running behind a Docker port mapping, the plugin's enhance-logs
  // feature injects http://localhost:<internal-port> into console output.
  // The internal port is unreachable from the host browser, so we disable
  // enhanced logs in that case. Everything else (the devtools panel, source
  // injection, router/query inspection) works fine through the port mapping.
  if (publicPort !== undefined) {
    devtoolsConfig.enhancedLogs = { enabled: false }
  }

  return devtools(devtoolsConfig)
}
