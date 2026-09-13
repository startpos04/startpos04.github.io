/**
 * vite-plugin.ts — Shared Serwist Vite plugin for all StartPOS apps.
 *
 * Builds the service worker and (in production) injects precache manifests.
 * Both apps import and re-export `tanstackSerwistPlugin` from here so the
 * logic lives in one place.
 *
 * Usage in each app's vite-plugin.ts:
 *   export { tanstackSerwistPlugin } from '@platform/vite-plugin'
 *
 * App-level customisation (glob patterns, SW entry path, etc.) is passed
 * through SerwistPluginOptions so apps can diverge without forking this file.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { injectManifest } from '@serwist/build'
import type { Plugin } from 'vite'
import { build } from 'vite'

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SerwistPluginOptions {
  /**
   * Path to the SW entry TypeScript file, relative to the app root.
   * @default 'src/sw.ts'
   */
  swEntry?: string

  /**
   * Glob patterns for the shell precache manifest (HTML, fonts, icons…).
   * Injected into self.__SW_MANIFEST.
   * @default ['**\/*.{html,webmanifest,ico,png,svg,woff,woff2}']
   */
  shellGlobs?: string[]

  /**
   * Glob patterns for the lazy precache manifest (JS, CSS).
   * Injected into self.__SW_LAZY_MANIFEST.
   * Omit or pass [] to disable lazy precaching (admin app).
   * @default ['**\/*.{js,css}']
   */
  lazyGlobs?: string[]

  /**
   * Glob patterns to exclude from the lazy precache.
   * @default ['**\/opfs-worker*.js']
   */
  lazyGlobIgnores?: string[]

  /**
   * Path to the platform package public/ directory containing the shared
   * offline HTML pages. When provided, the plugin copies them into the app's
   * output public/ directory before manifest injection.
   *
   * Resolve this in the app's vite-plugin.ts with:
   *   import { resolve } from 'node:path'
   *   platformPublicDir: resolve(__dirname, '../../packages/platform/public')
   */
  platformPublicDir?: string
}

// ---------------------------------------------------------------------------
// Deployment build ID
// ---------------------------------------------------------------------------

/**
 * Resolves a unique, stable identifier for the current deployment.
 *
 * Priority:
 *   1. VERCEL_DEPLOYMENT_ID  — unique per Vercel deploy, even on redeploy.
 *   2. VERCEL_GIT_COMMIT_SHA — stable per commit, good fallback.
 *   3. git rev-parse HEAD    — local builds outside Vercel.
 *   4. Date.now()            — last resort (shallow checkout, no git).
 */
export function resolveBuildId(): string {
  if (process.env['VERCEL_DEPLOYMENT_ID']) return process.env['VERCEL_DEPLOYMENT_ID']
  if (process.env['VERCEL_GIT_COMMIT_SHA']) return process.env['VERCEL_GIT_COMMIT_SHA']
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return Date.now().toString()
  }
}

// ---------------------------------------------------------------------------
// SW builder
// ---------------------------------------------------------------------------

async function buildServiceWorker(rootDir: string, production: boolean, opts: SerwistPluginOptions): Promise<void> {
  const outName = 'sw.js'
  const outDir = production ? path.resolve(rootDir, '.output', 'public') : path.resolve(rootDir, 'public')

  const swSrc = path.resolve(rootDir, opts.swEntry ?? 'src/sw.ts')
  const swDest = path.resolve(outDir, outName)
  const buildId = production ? resolveBuildId() : 'dev'

  // Copy shared offline HTML pages into the output directory so they are
  // picked up by injectManifest's globPatterns and precached with the shell.
  if (production && opts.platformPublicDir) {
    const htmlFiles = ['offline.html', 'offline-page.html', 'offline-no-cache.html']
    for (const file of htmlFiles) {
      const src = path.resolve(opts.platformPublicDir, file)
      const dest = path.resolve(outDir, file)
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest)
      }
    }
  }

  // Resolve the platform package root so the SW sub-build can alias
  // @platform/* imports (the sub-build runs with configFile:false, so Vite's
  // main config aliases are not inherited).
  const platformRoot = path.resolve(__dirname)

  try {
    await build({
      root: rootDir,
      configFile: false,
      resolve: {
        alias: [
          {
            find: /^@platform\/(.*)/,
            replacement: `${platformRoot}/$1`,
          },
        ],
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
        'process.env': JSON.stringify({
          NODE_ENV: production ? 'production' : 'development',
          BUILD_ID: buildId,
        }),
      },
      build: {
        lib: {
          entry: swSrc,
          formats: ['es'],
          fileName: () => outName,
        },
        outDir,
        emptyOutDir: false,
        minify: production,
        rollupOptions: {
          output: { entryFileNames: outName },
        },
      },
      logLevel: 'error',
    })

    if (production) {
      const shellGlobs = opts.shellGlobs ?? ['**/*.{html,webmanifest,ico,png,svg,woff,woff2}']
      const shellResult = await injectManifest({
        swSrc: swDest,
        swDest,
        globDirectory: outDir,
        globPatterns: shellGlobs,
        injectionPoint: 'self.__SW_MANIFEST',
      })

      const lazyGlobs = opts.lazyGlobs ?? ['**/*.{js,css}']
      const lazyIgnores = opts.lazyGlobIgnores ?? ['**/opfs-worker*.js']

      // Only inject __SW_LAZY_MANIFEST when lazyGlobs is non-empty.
      // Apps that pass [] opt out of lazy precaching entirely.
      if (lazyGlobs.length > 0) {
        const lazyResult = await injectManifest({
          swSrc: swDest,
          swDest,
          globDirectory: outDir,
          globPatterns: lazyGlobs,
          globIgnores: lazyIgnores,
          injectionPoint: 'self.__SW_LAZY_MANIFEST',
        })
        console.info(`✅ [SERWIST] Build ${buildId} — precached ${shellResult.count} shell files, queued ${lazyResult.count} for background caching`)
      } else {
        console.info(`✅ [SERWIST] Build ${buildId} — precached ${shellResult.count} shell files (no lazy manifest)`)
      }
    }
  } catch (error) {
    console.error('❌ [SERWIST] Build failed:', error)
  }
}

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

/**
 * Vite plugin that builds the Serwist service worker.
 *
 * - Dev:  skips the build entirely (SW is disabled in dev).
 * - Prod buildStart:  builds the SW without manifest injection (fast first pass).
 * - Prod closeBundle: rebuilds and injects precache manifests once the app
 *   bundle is fully written.
 */
export function tanstackSerwistPlugin(opts: SerwistPluginOptions = {}): Plugin {
  let rootDir: string
  let isProduction: boolean
  let isBuilding = false

  return {
    name: 'tanstack-serwist',
    configResolved(config) {
      rootDir = config.root
      isProduction = config.command === 'build'
    },
    async buildStart() {
      if (!isProduction) {
        console.log('[SERWIST] Skipping service worker build in development mode')
        return
      }
      if (!isBuilding) {
        isBuilding = true
        await buildServiceWorker(rootDir, false, opts)
        isBuilding = false
      }
    },
    async closeBundle() {
      if (isProduction && !isBuilding) {
        isBuilding = true
        await buildServiceWorker(rootDir, true, opts)
        isBuilding = false
      }
    },
  }
}
