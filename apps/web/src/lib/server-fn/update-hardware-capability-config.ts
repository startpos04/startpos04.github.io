/**
 * update-hardware-capability-config.ts
 *
 * Upsert or delete a CapabilityConfiguration row for hardware settings
 * belonging to a specific capability (e.g. COMPLETE_CHECKOUT).
 *
 * This writes to the `capability_configurations` table — NOT the generic
 * `configurations` table. Hardware toggle rows are branch-scoped.
 *
 * Used by: Settings → Capabilities → COMPLETE_CHECKOUT hardware config rows
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const UpdateHardwareCapabilityConfigSchema = z.object({
  /** The capability that owns this config, e.g. "COMPLETE_CHECKOUT" */
  capabilityId: z.string().min(1),
  /** Config key, e.g. "barcode_scanner_enabled" or "cash_drawer_enabled" */
  key: z.string().min(1),
  /** Value stored as string; BOOLEAN keys use "true" / "false" */
  value: z.string(),
  /** Hint for the UI on how to parse the stored value */
  dataType: z.enum(['BOOLEAN', 'STRING', 'NUMBER', 'JSON']),
  /** BRANCH = this branch only; BUSINESS = all branches */
  scope: z.enum(['BRANCH', 'BUSINESS']),
})

type UpdateHardwareCapabilityConfigInput = z.infer<typeof UpdateHardwareCapabilityConfigSchema>

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const updateHardwareCapabilityConfig = createServerFn({ method: 'POST' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_MANAGE_SETTINGS), requireTenantContext()])
  .inputValidator((data: UpdateHardwareCapabilityConfigInput) => UpdateHardwareCapabilityConfigSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ success: boolean; message?: string }> => {
    const { businessId, branchId } = getTenantContext(context).user
    const { capabilityId, key, value, dataType, scope } = data

    try {
      if (scope === 'BRANCH') {
        await rootPrisma.capabilityConfiguration.upsert({
          where: {
            capabilityId_key_branchId_scope: {
              capabilityId,
              key,
              branchId,
              scope: 'BRANCH',
            },
          },
          create: {
            capabilityId,
            key,
            value,
            dataType,
            scope: 'BRANCH',
            branchId,
          },
          update: { value },
        })
      } else {
        await rootPrisma.capabilityConfiguration.upsert({
          where: {
            capabilityId_key_businessId_scope: {
              capabilityId,
              key,
              businessId,
              scope: 'BUSINESS',
            },
          },
          create: {
            capabilityId,
            key,
            value,
            dataType,
            scope: 'BUSINESS',
            businessId,
          },
          update: { value },
        })
      }

      return { success: true }
    } catch (error) {
      console.error('[updateHardwareCapabilityConfig] Error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save hardware config',
      }
    }
  })
