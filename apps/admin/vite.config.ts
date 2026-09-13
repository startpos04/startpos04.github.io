import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { tanstackDevtoolsPlugin } from '../../packages/platform/vite-devtools'
import { tanstackSerwistPlugin } from './vite-plugin'

const port = Number(process.env['PORT'] ?? 3001)
const publicPort = Number(process.env['PUBLIC_PORT'] ?? port)
const dockerDev = process.env['DOCKER_DEV'] === 'true'

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

const config = defineConfig({
  resolve: {
    // Force all React-ecosystem packages to resolve from a single location.
    // Without this, packages/platform (resolved via @platform/ alias) uses its own
    // node_modules/react junction while apps/admin uses its own — Vite 7 / Rolldown
    // can assign different module IDs to these two junction paths even though they
    // both point to the same .pnpm singleton, producing two React instances in the
    // browser bundle and the "Cannot read properties of null (reading 'useContext')"
    // hook error at runtime.
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
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
        find: /^@\/(.*)/,
        replacement: `${resolve(__dirname, 'src')}/$1`,
      },
      {
        find: /^prisma\/(.*)/,
        replacement: `${resolve(__dirname, '../../packages/platform/prisma')}/$1`,
      },
    ],
  },
  plugins: [
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart(),
    nitro({
      routeRules: {
        '/**': { headers: securityHeaders },
      },
    }),
    ...tanstackDevtoolsPlugin(dockerDev ? { publicPort } : {}),
    tailwindcss(),
    viteReact(),
    tanstackSerwistPlugin(),
  ],
  server: {
    port,
    strictPort: true,
    host: true,
    watch: { usePolling: dockerDev },
    headers: securityHeaders,
    ...(dockerDev ? { hmr: { host: 'localhost', clientPort: publicPort } } : {}),
  },
  preview: {
    host: true,
    port,
    strictPort: true,
    headers: securityHeaders,
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
        drop_console: !!process.env['CONSOLE_LOG'],
        drop_debugger: true,
      },
    },
  },
})

export default config
