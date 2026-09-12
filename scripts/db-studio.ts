/**
 * db-studio.ts
 *
 * Loads env files and launches Prisma Studio.
 * Run via: pnpm db:studio
 */

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(__dirname, '..')

const result = spawnSync('pnpm', ['exec', 'prisma', 'studio'], {
  cwd: resolve(root, 'apps/web'),
  stdio: 'inherit',
  shell: true,
})

process.exit(result.status ?? 0)
