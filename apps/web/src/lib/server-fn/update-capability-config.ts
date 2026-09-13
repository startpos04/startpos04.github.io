/**
 * update-capability-config.ts — Upsert a Configuration row for a capability setting
 *
 * Used by Settings → Capabilities when a user edits a config field beneath a capability.
 * Writes to the Configuration table (the live business/branch config store).
 *
 * The upsert is idempotent — safe to call multiple times with the same value.
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import type { ConfigurationKey, ConfigurationScope } from 'prisma/generated/prisma/enums'
import { z } from 'zod'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const UpdateCapabilityConfigSchema = z.object({
  /** The ConfigurationKey, e.g. "LOW_STOCK_THRESHOLD" */
  key: z.string().min(1),
  value: z.string(),
  /** BRANCH = affects this branch only; BUSINESS = affects all branches */
  scope: z.enum(['BRANCH', 'BUSINESS']),
})

type UpdateCapabilityConfigInput = z.infer<typeof UpdateCapabilityConfigSchema>

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const updateCapabilityConfig = createServerFn({ method: 'POST' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_MANAGE_SETTINGS), requireTenantContext()])
  .inputValidator((data: UpdateCapabilityConfigInput) => UpdateCapabilityConfigSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ success: boolean; message?: string }> => {
    const { businessId, branchId } = getTenantContext(context).user
    const { key, value, scope } = data

    try {
      const configKey = key as ConfigurationKey
      const configScope = scope as ConfigurationScope

      if (scope === 'BRANCH') {
        await rootPrisma.configuration.upsert({
          where: { key_branchId_scope: { key: configKey, branchId, scope: configScope } },
          create: { key: configKey, value, scope: configScope, branchId },
          update: { value },
        })
      } else {
        await rootPrisma.configuration.upsert({
          where: { key_businessId_scope: { key: configKey, businessId, scope: configScope } },
          create: { key: configKey, value, scope: configScope, businessId },
          update: { value },
        })
      }

      return { success: true }
    } catch (error) {
      console.error('[updateCapabilityConfig] Error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save config',
      }
    }
  })
