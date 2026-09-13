/**
 * toggle-branch-capability.ts — Enable or disable a capability at the branch level
 *
 * This allows branch managers to control which capabilities are active for their
 * specific branch, independent of other branches in the business.
 *
 * Accepted keys:
 *   - Any valid CapabilityKey from the Capabilities enum
 *   - QUICK_ADD_PRODUCT — a branch-only UI feature flag (not a subscription capability)
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import { Capabilities, type CapabilityKey } from '@platform/lib/entitlement/capability-keys'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'

// ---------------------------------------------------------------------------
// Extra branch-only config keys that are not subscription capabilities
// ---------------------------------------------------------------------------

const BRANCH_UI_CONFIG_KEYS = new Set(['QUICK_ADD_PRODUCT'])

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const ToggleBranchCapabilitySchema = z.object({
  capabilityKey: z
    .string()
    .refine(
      (val): val is CapabilityKey | 'QUICK_ADD_PRODUCT' => Object.values(Capabilities).includes(val as CapabilityKey) || BRANCH_UI_CONFIG_KEYS.has(val),
      'Invalid capability key',
    ),
  enabled: z.boolean(),
})

type ToggleBranchCapabilityInput = z.infer<typeof ToggleBranchCapabilitySchema>

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const toggleBranchCapability = createServerFn({ method: 'POST' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_MANAGE_SETTINGS), requireTenantContext()])
  .inputValidator((data: ToggleBranchCapabilityInput) => ToggleBranchCapabilitySchema.parse(data))
  .handler(async ({ context, data }): Promise<{ success: boolean; message?: string }> => {
    const { branchId } = getTenantContext(context).user

    const { capabilityKey, enabled } = data

    try {
      // Upsert the branch-level capability config
      await rootPrisma.branchCapabilityConfig.upsert({
        where: {
          branchId_capabilityId: {
            branchId,
            capabilityId: capabilityKey,
          },
        },
        create: {
          branchId,
          capabilityId: capabilityKey,
          enabled,
        },
        update: {
          enabled,
        },
      })

      return {
        success: true,
        message: enabled ? `${capabilityKey} enabled for this branch` : `${capabilityKey} disabled for this branch`,
      }
    } catch (error) {
      console.error('[toggleBranchCapability] Error:', error)
      return {
        success: false,
        message: 'Failed to update capability state',
      }
    }
  })
