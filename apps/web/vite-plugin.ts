/**
 * vite-plugin.ts — Web app Serwist plugin.
 *
 * Thin wrapper around the shared plugin in packages/platform/vite-plugin.ts.
 * App-specific options are passed here; all build logic lives in the platform.
 *
 * Web-specific config:
 *   - lazyGlobs includes JS + CSS (background precache for full offline support)
 *   - lazyGlobIgnores excludes the OPFS SQLite worker (large, fetched on demand)
 *   - platformPublicDir wires in the shared offline fallback HTML pages
 */

import { resolve } from 'node:path'
import type { SerwistPluginOptions } from '../../packages/platform/vite-plugin'
import { tanstackSerwistPlugin as _tanstackSerwistPlugin } from '../../packages/platform/vite-plugin'

const platformPublicDir = resolve(__dirname, '../../packages/platform/public')

const webOptions: SerwistPluginOptions = {
  swEntry: 'src/sw.ts',
  shellGlobs: ['**/*.{html,webmanifest,ico,png,svg,woff,woff2}'],
  lazyGlobs: ['**/*.{js,css}'],
  lazyGlobIgnores: ['**/opfs-worker*.js'],
  platformPublicDir,
}

export function tanstackSerwistPlugin() {
  return _tanstackSerwistPlugin(webOptions)
}
