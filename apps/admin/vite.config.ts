import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
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
    ...(dockerDev ? [] : [devtools()]),
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
