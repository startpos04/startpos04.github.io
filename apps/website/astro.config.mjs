import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  output: 'static',
  site: 'https://startpos04.github.io',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@constants': path.resolve(__dirname, '../../packages/constants'),
      },
    },
  },
})
