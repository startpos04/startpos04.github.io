import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { tanstackDevtoolsPlugin } from '../../packages/platform/vite-devtools'
import { tanstackSerwistPlugin } from './vite-plugin'

const port = Number(process.env['PORT'] ?? 3000)
const publicPort = Number(process.env['PUBLIC_PORT'] ?? port)
const dockerDev = process.env['DOCKER_DEV'] === 'true'

// ---------------------------------------------------------------------------
// Cross-Origin Isolation — required for SharedArrayBuffer (SQLite WASM).
// Present in dev, preview, and production.
// ---------------------------------------------------------------------------
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

// ---------------------------------------------------------------------------
// Security headers — Phase 2 Legal Compliance
// (unchanged — see comments in original)
// ---------------------------------------------------------------------------
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy-Report-Only': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://accounts.google.com https://graph.facebook.com",
    'frame-src https://js.stripe.com https://hooks.stripe.com',
    "img-src 'self' data: https://lh3.googleusercontent.com https://graph.facebook.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; '),
  ...crossOriginIsolationHeaders,
}

// ---------------------------------------------------------------------------
// FIX: Vite's dev-server `server.headers` option does NOT apply to static
// files served from `public/` (e.g. the OPFS worker emitted by
// @tanstack/browser-db-sqlite-persistence). That static-serve middleware
// bypasses `server.headers` entirely, so COEP/COOP never reach it in dev,
// and the browser refuses to instantiate the worker.
//
// This plugin injects the headers via raw connect middleware with
// `enforce: 'pre'`, which guarantees it runs before Vite's internal static
// file middleware — so every response, including public/ assets, gets them.
// ---------------------------------------------------------------------------
function crossOriginHeadersPlugin(): Plugin {
  // Routes where Stripe Elements is used — COEP must be removed so the iframe loads
  const stripeCOEPPaths = ['/business/subscription/checkout', '/business/subscription/credits', '/billing']

  const headersFor = (path: string) => {
    const noCoep = stripeCOEPPaths.some(p => path.startsWith(p))
    if (noCoep) {
      const { 'Cross-Origin-Embedder-Policy': _drop, ...rest } = securityHeaders
      return rest
    }
    return securityHeaders
  }

  return {
    name: 'force-security-headers',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const headers = headersFor(req.url ?? '')
        for (const [key, value] of Object.entries(headers)) {
          res.setHeader(key, value)
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const headers = headersFor(req.url ?? '')
        for (const [key, value] of Object.entries(headers)) {
          res.setHeader(key, value)
        }
        next()
      })
    },
  }
}

const serverConfig = {
  port,
  strictPort: true,
  host: true,
  watch: {
    usePolling: dockerDev,
  },
  // Keep this as a fallback for SSR/transformed responses; the plugin above
  // is what actually guarantees static assets (public/) get the headers too.
  headers: securityHeaders,
  ...(dockerDev
    ? {
        hmr: {
          host: 'localhost',
          clientPort: publicPort,
        },
      }
    : {}),
}

const config = defineConfig({
  resolve: {
    // Force all React-ecosystem packages to resolve from a single location.
    // Without this, packages/platform (resolved via @platform/ alias) uses its own
    // node_modules/react junction while apps/web uses its own — Vite 7 / Rolldown
    // can assign different module IDs to these two junction paths even though they
    // both point to the same .pnpm singleton, producing two React instances in the
    // browser bundle and "Invalid hook call" errors at runtime.
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'next-themes',
      '@tanstack/react-router',
      '@tanstack/react-store',
      '@tanstack/react-query',
      '@tanstack/react-db',
      '@tanstack/react-devtools',
      '@tanstack/react-query-devtools',
      '@tanstack/react-router-devtools',
      '@tanstack/react-form-devtools',
    ],
    alias: [
      {
        find: /^@platform\/(.*)/,
        replacement: `${resolve(__dirname, '../../packages/platform')}/$1`,
      },
      {
        // Allow packages/platform files to resolve @/ imports from apps/web/src
        find: /^@\/(.*)/,
        replacement: `${resolve(__dirname, 'src')}/$1`,
      },
      {
        // Allow all packages to resolve prisma/generated/... from packages/platform/prisma
        find: /^prisma\/(.*)/,
        replacement: `${resolve(__dirname, '../../packages/platform/prisma')}/$1`,
      },
    ],
  },
  plugins: [
    crossOriginHeadersPlugin(), // must be first: enforce:'pre' + registration order
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    nitro({
      routeRules: {
        '/**': {
          headers: securityHeaders,
        },
        // Stripe Elements requires cross-origin iframes — remove COEP on billing pages
        '/business/subscription/checkout/**': {
          headers: {
            ...securityHeaders,
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
          },
        },
        '/business/subscription/credits/**': {
          headers: {
            ...securityHeaders,
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
          },
        },
        '/billing/**': {
          headers: {
            ...securityHeaders,
            'Cross-Origin-Embedder-Policy': 'unsafe-none',
          },
        },
      },
    }),
    ...tanstackDevtoolsPlugin(dockerDev ? { publicPort } : {}),
    tailwindcss(),
    viteReact(),
    tanstackSerwistPlugin(),
  ],
  server: serverConfig,
  preview: {
    host: true,
    port,
    strictPort: true,
    headers: securityHeaders,
  },
  ssr: {
    // next-themes uses React.useContext internally. When Vite SSR externalizes it
    // (the default for node_modules packages), it gets require()'d at runtime with
    // a React module that hasn't fully initialized its hooks — causing
    // "exports.useContext is null" errors. Bundling it into the SSR build ensures
    // it shares the same React instance as the rest of the app.
    noExternal: ['next-themes'],
  },
  optimizeDeps: {
    // Explicitly pre-bundle React so the optimizer always produces a single
    // shared chunk — prevents Vite from creating separate React instances when
    // platform source files (resolved via @platform/ alias) import 'react'
    // from a different junction path than the app itself.
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-router',
      '@tanstack/react-store',
      '@tanstack/react-query',
      '@tanstack/react-devtools',
      '@tanstack/react-query-devtools',
      '@tanstack/react-router-devtools',
      '@tanstack/react-form-devtools',
    ],
    exclude: ['@tanstack/browser-db-sqlite-persistence'],
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        // Keep console.* calls so server-side errors are visible in preview/production logs.
        // Flip these to true only when deploying to a platform with centralized log ingestion.
        drop_console: !!process.env['CONSOLE_LOG'],
        drop_debugger: true,
      },
    },
  },
})

export default config
