/**
 * vite-plugin.ts — Admin app Serwist plugin.
 *
 * Thin wrapper around the shared plugin in packages/platform/vite-plugin.ts.
 * App-specific options are passed here; all build logic lives in the platform.
 *
 * Admin-specific config:
 *   - lazyGlobs includes JS + CSS (background precache for fast repeat visits)
 *   - No OPFS worker exclusion needed (admin has no local SQLite DB)
 *   - platformPublicDir wires in the shared offline fallback HTML pages
 */

import { resolve } from 'node:path'
import type { SerwistPluginOptions } from '../../packages/platform/vite-plugin'
import { tanstackSerwistPlugin as _tanstackSerwistPlugin } from '../../packages/platform/vite-plugin'

const platformPublicDir = resolve(__dirname, '../../packages/platform/public')

const adminOptions: SerwistPluginOptions = {
  swEntry: 'src/sw.ts',
  shellGlobs: ['**/*.{html,webmanifest,ico,png,svg,woff,woff2}'],
  lazyGlobs: ['**/*.{js,css}'],
  platformPublicDir,
}

export function tanstackSerwistPlugin() {
  return _tanstackSerwistPlugin(adminOptions)
}
