/**
 * fetch-hardware-capability-config.ts
 *
 * Reads CapabilityConfiguration rows for a given capability at the current branch.
 * Returns a typed map of key → value so callers don't need to parse the raw rows.
 *
 * Used by: POS page (offline-capable via collection), Settings page (server query)
 *
 * NOTE: The capabilityConfigurationCollection is eagerly synced on login, so
 * the POS page reads directly from the collection via useLiveQuery. This server
 * function is used by the settings page only (non-POS context).
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'

// ---------------------------------------------------------------------------
// Shared hardware config key constants
// ---------------------------------------------------------------------------

/** CapabilityConfiguration keys used for COMPLETE_CHECKOUT hardware settings */
export const HARDWARE_CONFIG_KEYS = {
  BARCODE_SCANNER_ENABLED: 'barcode_scanner_enabled',
  CASH_DRAWER_ENABLED: 'cash_drawer_enabled',
} as const

export type HardwareConfigKey = (typeof HARDWARE_CONFIG_KEYS)[keyof typeof HARDWARE_CONFIG_KEYS]

/**
 * Human-readable metadata for each hardware config key.
 * Used to render the settings UI rows without a separate DB lookup.
 */
export const HARDWARE_CONFIG_META: Record<
  HardwareConfigKey,
  { label: string; description: string; defaultValue: boolean }
> = {
  barcode_scanner_enabled: {
    label: 'Barcode Scanner',
    description:
      'Enable keyboard-emulation barcode scanner support. When enabled, the system requires a barcode scanner to be detected before checkout can proceed.',
    defaultValue: false,
  },
  cash_drawer_enabled: {
    label: 'Cash Drawer',
    description:
      'Enable automatic cash drawer opening on cash payments. When enabled, the system requires a Bluetooth printer with a connected cash drawer before checkout can proceed.',
    defaultValue: false,
  },
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export type HardwareConfigRow = {
  key: HardwareConfigKey
  label: string
  description: string
  value: boolean
  defaultValue: boolean
  isOverridden: boolean
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

const FetchHardwareCapabilityConfigSchema = z.object({
  capabilityId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

export const fetchHardwareCapabilityConfig = createServerFn({ method: 'GET' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_VIEW_SETTINGS), requireTenantContext()])
  .inputValidator((data: { capabilityId: string }) => FetchHardwareCapabilityConfigSchema.parse(data))
  .handler(async ({ context, data }): Promise<HardwareConfigRow[]> => {
    const { branchId } = getTenantContext(context).user
    const { capabilityId } = data

    const rows = await rootPrisma.capabilityConfiguration.findMany({
      where: {
        capabilityId,
        branchId,
        scope: 'BRANCH',
      },
      select: { key: true, value: true },
    })

    const valueMap = new Map(rows.map(r => [r.key, r.value]))

    return (Object.values(HARDWARE_CONFIG_KEYS) as HardwareConfigKey[]).map(key => {
      const meta = HARDWARE_CONFIG_META[key]
      const rawValue = valueMap.get(key)
      const value = rawValue !== undefined ? rawValue === 'true' : meta.defaultValue

      return {
        key,
        label: meta.label,
        description: meta.description,
        value,
        defaultValue: meta.defaultValue,
        isOverridden: rawValue !== undefined,
      }
    })
  })
