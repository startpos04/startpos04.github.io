/**
 * update-inventory-mode.ts — Set the inventory enforcement mode for this business
 *
 * Writes an ADMIN_DECISION sourced value to Business.livingCharacteristics for
 * the `inventoryCriticality` field, then triggers an IMMEDIATE recalculation so
 * the change propagates to the EntitlementEngine and capability outputs right away.
 *
 * Used by Settings → Capabilities → POS Settings card.
 *
 * Modes:
 *   none    — No stock tracking. Sales always proceed regardless of quantity.
 *   relaxed — Stock is tracked but sales are allowed even when stock goes negative.
 *   strict  — Sales are blocked when stock would fall below zero.
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'
import { correctCharacteristic } from '../evolution/capability-control'

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const UpdateInventoryModeSchema = z.object({
  mode: z.enum(['none', 'relaxed', 'strict']),
})

type UpdateInventoryModeInput = z.infer<typeof UpdateInventoryModeSchema>

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const updateInventoryMode = createServerFn({ method: 'POST' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_MANAGE_SETTINGS), requireTenantContext()])
  .inputValidator((data: UpdateInventoryModeInput) => UpdateInventoryModeSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ success: boolean; message?: string }> => {
    const { businessId, id: actorId } = getTenantContext(context).user

    const result = await correctCharacteristic(businessId, 'inventoryCriticality', data.mode, actorId)

    if (!result.ok) {
      return { success: false, message: result.reason }
    }

    return { success: true, message: `Inventory mode set to ${data.mode}` }
  })
