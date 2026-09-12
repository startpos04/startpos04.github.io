/**
 * environment-reset.ts
 *
 * Server function that wipes all E2E tenant data and re-seeds from scratch.
 * Guarded against production databases via isProductionDatabaseTarget().
 *
 * Flow:
 *  1. Verify DATABASE_URL is not production
 *  2. Delete all data for e2e businesses (FK cascade handles children)
 *  3. Clear all QaConditionState rows (so tests unlock from scratch)
 *  4. Re-run: entitlements → accounts → e2e seeders
 *  5. Return a summary of what was restored
 *
 * SUPERADMIN only.
 */

import { getServerContext } from '@platform/lib/better-auth/server-context'
import { buildPostgresUrl } from '@platform/lib/database-url'
import { createServerFn } from '@tanstack/react-start'
import { isProductionDatabaseTarget } from 'prisma/db-script-utils'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResetResult {
  ok: boolean
  error?: string
  summary?: {
    businessesDeleted: number
    conditionStatesCleared: number
    accountsRestored: number
    durationMs: number
  }
}

// ---------------------------------------------------------------------------
// resetQaEnvironment server function
// ---------------------------------------------------------------------------

export const resetQaEnvironment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { confirmationToken: string }) => d)
  .handler(async ({ data, context }): Promise<ResetResult> => {
    const ctx = getServerContext(context)

    // Only SUPERADMIN can reset the environment
    if (ctx.user.role !== 'SUPERADMIN') {
      return { ok: false, error: 'Only SUPERADMIN accounts can reset the QA environment.' }
    }

    // Confirmation token must be exactly "RESET"
    if (data.confirmationToken !== 'RESET') {
      return { ok: false, error: 'Invalid confirmation token. Type exactly: RESET' }
    }

    // Production guard — build the URL the same way the app does
    const dbUrl = buildPostgresUrl()
    if (!dbUrl) {
      return { ok: false, error: 'Could not determine database URL — check POSTGRES_* environment variables.' }
    }
    if (isProductionDatabaseTarget(dbUrl)) {
      return {
        ok: false,
        error: 'resetQaEnvironment() refused: detected production database. This operation is only allowed against local/test databases.',
      }
    }

    const startedAt = Date.now()
    console.info(`[environment-reset] Reset initiated by ${ctx.user.id} (${ctx.user.email})`)

    try {
      // Step 1: Find the e2e businesses by name
      const e2eBusinesses = await rootPrisma.business.findMany({
        where: { name: { in: ['E2E Test Restaurant', 'E2E Isolation Business'] } },
        select: { id: true, name: true },
      })

      let businessesDeleted = 0

      if (e2eBusinesses.length > 0) {
        const businessIds = e2eBusinesses.map(b => b.id)

        // Delete in dependency order to avoid FK violations
        // (cascade isn't guaranteed on all FKs, so we delete explicitly)
        console.info(`[environment-reset] Deleting data for ${e2eBusinesses.length} e2e businesses...`)

        await rootPrisma.$transaction(async tx => {
          // Operational data
          await tx.payment.deleteMany({ where: { transaction: { branchId: { in: await getBranchIds(businessIds) } } } })
          await tx.posTransaction.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.orderItem.deleteMany({ where: { order: { businessId: { in: businessIds } } } })
          await tx.order.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.inventoryMovement.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.inventory.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.vendorSession.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.task.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.purchaseItem.deleteMany({ where: { purchase: { businessId: { in: businessIds } } } })
          await tx.purchase.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.notification.deleteMany({ where: { businessId: { in: businessIds } } })
          // Membership + user data
          await tx.membership.deleteMany({ where: { businessId: { in: businessIds } } })
          // Products
          await tx.productVariant.deleteMany({ where: { product: { businessId: { in: businessIds } } } })
          await tx.product.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.productCategory.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.unit.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.supplier.deleteMany({ where: { businessId: { in: businessIds } } })
          // Billing
          await tx.creditLedger.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.usageCounter.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.businessSubscription.deleteMany({ where: { businessId: { in: businessIds } } })
          // Branches then business
          await tx.branch.deleteMany({ where: { businessId: { in: businessIds } } })
          await tx.business.deleteMany({ where: { id: { in: businessIds } } })
          // E2E users (those not having other memberships)
          const e2eEmails = [
            'e2e.admin@test.com',
            'e2e.supervisor@test.com',
            'e2e.cashier@test.com',
            'e2e.cashier2@test.com',
            'e2e.supervisor2@test.com',
            'e2e.cashier3@test.com',
            'e2e.admin2@test.com',
            'e2e.cashier4@test.com',
          ]
          await tx.account.deleteMany({ where: { user: { email: { in: e2eEmails } } } })
          await tx.user.deleteMany({ where: { email: { in: e2eEmails } } })
        })

        businessesDeleted = e2eBusinesses.length
      }

      // Step 2: Clear QaConditionState (unlock all conditions)
      const { count: conditionStatesCleared } = await rootPrisma.qaConditionState.deleteMany({})
      console.info(`[environment-reset] Cleared ${conditionStatesCleared} condition states`)

      // Step 3: Re-seed via tsx directly (avoids db:seed's hardcoded apps/web/.env path)
      console.info('[environment-reset] Re-seeding E2E data...')
      const { spawnSync } = await import('node:child_process')
      const { existsSync } = await import('node:fs')

      // Find the monorepo root — try known Docker path first, then cwd
      const candidates = ['/app', process.cwd()]
      const monoRoot = candidates.find(p => existsSync(`${p}/package.json`) && existsSync(`${p}/pnpm-workspace.yaml`))
      if (!monoRoot) {
        throw new Error('Cannot locate monorepo root — reset is only supported in the dev Docker environment.')
      }

      // Use admin .env (present in admin container); fall back to web .env for local dev
      const envFile = existsSync(`${monoRoot}/apps/admin/.env`) ? `apps/admin/.env` : `apps/web/.env`

      console.info(`[environment-reset] Using monorepo root: ${monoRoot}, env: ${envFile}`)
      const seedResult = spawnSync(
        'pnpm',
        [
          'exec',
          'tsx',
          `--env-file=${envFile}`,
          '--env-file=.env.config',
          '--tsconfig=packages/platform/tsconfig.json',
          'packages/platform/prisma/seeders/index.ts',
        ],
        {
          cwd: monoRoot,
          shell: true,
          stdio: 'pipe',
          env: { ...process.env, SEED_FOLDER: 'e2e', AUTO_CONFIRM: 'true' },
          timeout: 120_000,
        },
      )
      if (seedResult.status !== 0) {
        const stderr = seedResult.stderr?.toString() ?? ''
        const stdout = seedResult.stdout?.toString() ?? ''
        throw new Error(`Seeder exited with code ${seedResult.status}. ${stderr || stdout}`.trim())
      }
      console.info('[environment-reset] Seeder complete')

      // Count restored accounts
      const accountsRestored = await rootPrisma.user.count({
        where: {
          email: {
            in: [
              'e2e.admin@test.com',
              'e2e.supervisor@test.com',
              'e2e.cashier@test.com',
              'e2e.cashier2@test.com',
              'e2e.supervisor2@test.com',
              'e2e.cashier3@test.com',
              'e2e.admin2@test.com',
              'e2e.cashier4@test.com',
            ],
          },
        },
      })

      const durationMs = Date.now() - startedAt
      console.info(`[environment-reset] Complete in ${durationMs}ms — ${accountsRestored} accounts restored`)

      return {
        ok: true,
        summary: {
          businessesDeleted,
          conditionStatesCleared,
          accountsRestored,
          durationMs,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[environment-reset] Failed:', message)
      return { ok: false, error: `Reset failed: ${message}` }
    }
  })

// ---------------------------------------------------------------------------
// Helper — get all branch IDs for a set of business IDs
// ---------------------------------------------------------------------------

async function getBranchIds(businessIds: string[]): Promise<string[]> {
  const branches = await rootPrisma.branch.findMany({
    where: { businessId: { in: businessIds } },
    select: { id: true },
  })
  return branches.map(b => b.id)
}
