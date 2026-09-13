/**
 * fetch-entitlement-details.ts — Fetches detailed entitlement information
 * for the current business including plan entitlements, usage limits, and
 * current usage counts.
 *
 * This provides the data needed for the Settings → Entitlements tab to show
 * each capability with its corresponding entitlement configuration.
 */

import { Permissions } from '@platform/lib/authorization/permission-keys'
import { requirePermission } from '@platform/lib/better-auth/permission-middleware'
import type { CapabilityKey } from '@platform/lib/entitlement/capability-keys'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import type { ConfigurationKey } from 'prisma/generated/prisma/enums'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { getTenantContext, requireTenantContext } from '@/lib/better-auth/server-context'
import { CAPABILITY_REGISTRY } from '../onboarding/capability-registry'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../tutorial/feature-library'
import { HARDWARE_CONFIG_KEYS, HARDWARE_CONFIG_META } from './fetch-hardware-capability-config'

// ---------------------------------------------------------------------------
// Static map: which Configuration keys belong to each capability
// Only include configs that are genuinely owned by the capability —
// shared compliance settings (VAT, price display) live in the Compliance tab.
// ---------------------------------------------------------------------------

const CAPABILITY_CONFIG_KEYS: Partial<Record<string, ConfigurationKey[]>> = {
  MANAGE_INVENTORY: ['LOW_STOCK_THRESHOLD', 'BUFFER_RATE', 'AUTO_APPROVE_LOW_STOCK_REFILL'],
  VIEW_TRANSACTION_HISTORY: ['REFUND_WINDOW_HOURS', 'REFUND_REQUIRES_SUPERVISOR'],
} satisfies Partial<Record<string, ConfigurationKey[]>>

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/**
 * A resolved Configuration row for this capability, enriched with definition metadata.
 * The actual value stored in the Configuration table, or the definition's defaultValue
 * if no business/branch-specific row exists.
 */
export type CapabilityConfigRow = {
  key: string // ConfigurationKey, e.g. "LOW_STOCK_THRESHOLD"
  label: string // Human-readable label from ConfigurationDefinition
  description: string | null // Help text
  value: string // Current value (business/branch override or default)
  defaultValue: string // Platform default for comparison
  dataType: string // "BOOLEAN" | "STRING" | "NUMBER" | "JSON" | "ENUM"
  scope: string // "BRANCH" | "BUSINESS" — where this value is set
  isOverridden: boolean // true when the business/branch has a custom value
  /** If true this row lives in capability_configurations, not configurations */
  isHardwareConfig?: boolean
}

export type EntitlementDetail = {
  capabilityKey: CapabilityKey
  featureLabel: string
  featureDescription: string | null
  isOperational: boolean
  category: string // e.g., "SALES", "INVENTORY"
  isBranchLevel: boolean // false = business-level only (like MANAGE_BILLING)

  // Plan entitlement data
  usageLimit: number | null // null = unlimited
  currentUsage: number | null // null = not applicable

  // Capability state
  isEnabled: boolean // Whether the capability is active for this business
  isEnabledAtBranch: boolean // Whether the capability is enabled at THIS branch

  // Per-capability configuration rows (from CapabilityConfiguration table)
  configs: CapabilityConfigRow[]

  // Override info
  hasOverride: boolean
  overrideGranted: boolean | null
  overrideExpiresAt: Date | null
  overrideReason: string | null
}

export type CapabilityCategoryGroup = {
  category: string
  categoryLabel: string
  isOperational: boolean
  entitlements: EntitlementDetail[]
}

export type EntitlementSummaryData = {
  planName: string | null
  status: string
  billingModel: string
  includedTxPerMonth: number | null
  txUsedThisPeriod: number
  txRemaining: number | null
  categoryGroups: CapabilityCategoryGroup[]
}

// ---------------------------------------------------------------------------
// Server function
// ---------------------------------------------------------------------------

// Business-level only capabilities (should not appear in branch settings)
const BUSINESS_LEVEL_CAPABILITIES = new Set([
  'MANAGE_BILLING',
  'REACTIVATE_SUBSCRIPTION',
  'MANAGE_BRANCHES',
  'BUSINESS_VIEW_ANALYTICS', // Business-wide analytics
  'EXPORT_DATA', // Business-wide data export
])

export const fetchEntitlementDetails = createServerFn({ method: 'GET' })
  .middleware([authMiddleware, requirePermission(Permissions.BRANCH_VIEW_SETTINGS), requireTenantContext()])
  .handler(async ({ context }): Promise<EntitlementSummaryData | null> => {
    const { businessId, branchId } = getTenantContext(context).user

    try {
      console.log('[fetchEntitlementDetails] Step 1: Fetching subscription...')
      // Fetch business subscription with plan and entitlements
      const subscription = await rootPrisma.businessSubscription.findUnique({
        where: { businessId },
        select: {
          status: true,
          billingModel: true,
          plan: {
            select: {
              name: true,
              includedTxPerMonth: true,
              entitlements: {
                select: {
                  featureKey: true,
                  usageLimit: true,
                  feature: {
                    select: {
                      label: true,
                      description: true,
                      isOperational: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      console.log('[fetchEntitlementDetails] Step 2: Subscription fetched:', !!subscription)

      if (!subscription) {
        return {
          planName: null,
          status: 'NO_SUBSCRIPTION',
          billingModel: 'UNKNOWN',
          includedTxPerMonth: null,
          txUsedThisPeriod: 0,
          txRemaining: null,
          categoryGroups: [],
        }
      }

      // Fetch usage counter for current period FOR THIS BRANCH
      const usageCounter = await rootPrisma.usageCounter.findFirst({
        where: {
          businessId,
          branchId,
          isClosed: false,
        },
        select: { txCount: true },
        orderBy: { billingPeriodStart: 'desc' },
      })

      const txUsed = usageCounter?.txCount ?? 0
      const includedTx = subscription.plan.includedTxPerMonth
      const txRemaining = includedTx === -1 ? null : Math.max(0, includedTx - txUsed)

      console.log('[fetchEntitlementDetails] Step 3: Fetching capability states...')
      // Fetch capability states
      const capabilityStates = await rootPrisma.businessCapabilityState.findMany({
        where: { businessId },
        select: { capabilityId: true, state: true },
      })

      const activeStates = new Set(['ENABLED', 'CONFIGURED'])
      const enabledCapabilities = new Set(capabilityStates.filter(cs => activeStates.has(cs.state)).map(cs => cs.capabilityId))

      console.log('[fetchEntitlementDetails] Step 4: Fetching branch capability configs...')
      // Fetch branch-level capability configurations
      const branchConfigs = await rootPrisma.branchCapabilityConfig.findMany({
        where: { branchId },
        select: { capabilityId: true, enabled: true },
      })

      // Build map of branch-level enabled state (default to true if not found)
      const branchEnabledMap = new Map<string, boolean>()
      for (const config of branchConfigs) {
        branchEnabledMap.set(config.capabilityId, config.enabled)
      }

      console.log('[fetchEntitlementDetails] Step 4b: Fetching Configuration rows for capability config display...')
      // Collect all ConfigurationKeys needed across all capabilities shown
      const allConfigKeys = Array.from(new Set(Object.values(CAPABILITY_CONFIG_KEYS).flat()))

      // Fetch definitions for all relevant keys (label, description, dataType, defaultValue)
      const definitions = await rootPrisma.configurationDefinition.findMany({
        where: { key: { in: allConfigKeys as ConfigurationKey[] } },
        select: { key: true, label: true, description: true, dataType: true, defaultValue: true, scope: true },
      })
      const defMap = new Map(definitions.map(d => [d.key as string, d]))

      // Fetch the actual business/branch-scoped Configuration rows
      const configRows = await rootPrisma.configuration.findMany({
        where: {
          key: { in: allConfigKeys as ConfigurationKey[] },
          OR: [
            { businessId, scope: 'BUSINESS' },
            { branchId, scope: 'BRANCH' },
          ],
        },
        select: { key: true, value: true, scope: true },
      })

      // Build key → most-specific value map (BRANCH wins over BUSINESS)
      const valueMap = new Map<string, { value: string; scope: string }>()
      for (const row of configRows) {
        const existing = valueMap.get(row.key as string)
        if (!existing || row.scope === 'BRANCH') {
          valueMap.set(row.key as string, { value: row.value, scope: row.scope })
        }
      }

      // Build the per-capability config rows map
      const capabilityConfigMap = new Map<string, CapabilityConfigRow[]>()
      for (const [capabilityId, keys] of Object.entries(CAPABILITY_CONFIG_KEYS)) {
        if (!keys) continue
        const rows: CapabilityConfigRow[] = []
        for (const key of keys) {
          const def = defMap.get(key as string)
          if (!def) continue
          const current = valueMap.get(key as string)
          rows.push({
            key: key as string,
            label: def.label,
            description: def.description ?? null,
            value: current?.value ?? def.defaultValue,
            defaultValue: def.defaultValue,
            dataType: def.dataType,
            scope: current?.scope ?? def.scope,
            isOverridden: !!current,
          })
        }
        if (rows.length > 0) capabilityConfigMap.set(capabilityId, rows)
      }

      console.log('[fetchEntitlementDetails] Step 4c: Fetching COMPLETE_CHECKOUT hardware configs...')
      // Fetch CapabilityConfiguration rows for COMPLETE_CHECKOUT hardware settings.
      // These live in capability_configurations (not configurations) and are always BRANCH-scoped.
      const hardwareConfigRows = await rootPrisma.capabilityConfiguration.findMany({
        where: { capabilityId: 'COMPLETE_CHECKOUT', branchId, scope: 'BRANCH' },
        select: { key: true, value: true },
      })
      const hardwareValueMap = new Map(hardwareConfigRows.map(r => [r.key, r.value]))

      // Build COMPLETE_CHECKOUT hardware config rows and merge into capabilityConfigMap.
      // Each hardware key (barcode_scanner_enabled, cash_drawer_enabled) becomes its own
      // CapabilityConfigRow with isHardwareConfig = true so the UI knows to call the
      // updateHardwareCapabilityConfig server fn instead of updateCapabilityConfig.
      const hardwareRows: CapabilityConfigRow[] = Object.values(HARDWARE_CONFIG_KEYS).map(key => {
        const meta = HARDWARE_CONFIG_META[key]
        const rawValue = hardwareValueMap.get(key)
        return {
          key,
          label: meta.label,
          description: meta.description,
          value: rawValue ?? String(meta.defaultValue),
          defaultValue: String(meta.defaultValue),
          dataType: 'BOOLEAN',
          scope: 'BRANCH',
          isOverridden: rawValue !== undefined,
          isHardwareConfig: true,
        }
      })

      // Merge: hardware rows are appended after any existing Configuration rows for this capability
      const existingCheckoutConfigs = capabilityConfigMap.get('COMPLETE_CHECKOUT') ?? []
      capabilityConfigMap.set('COMPLETE_CHECKOUT', [...existingCheckoutConfigs, ...hardwareRows])

      console.log('[fetchEntitlementDetails] Step 5: Fetching overrides...')
      // Fetch entitlement overrides
      const overrides = await rootPrisma.entitlementOverride.findMany({
        where: { businessId },
        select: {
          featureKey: true,
          granted: true,
          expiresAt: true,
          reason: true,
        },
      })

      const overrideMap = new Map(
        overrides.map(o => [
          o.featureKey,
          {
            granted: o.granted,
            expiresAt: o.expiresAt,
            reason: o.reason,
          },
        ]),
      )

      console.log('[fetchEntitlementDetails] Step 6: Fetching usage counts...')
      // Fetch current usage counts for capabilities with usage limits
      let memberCount = 0
      let productCount = 0

      try {
        // Count memberships (employees) ACROSS ALL BRANCHES (business-wide)
        // Employees can rotate between branches, so limit is business-level
        memberCount = await rootPrisma.membership.count({
          where: {
            businessId,
            deletedAt: null,
          },
        })

        // Count products for this business (products are business-level, not branch-level)
        productCount = await rootPrisma.product.count({
          where: {
            businessId,
            deletedAt: null,
          },
        })
      } catch (err) {
        console.warn('[fetchEntitlementDetails] Failed to fetch usage counts:', err)
      }

      console.log('[fetchEntitlementDetails] Step 7: Building entitlements...')
      // Note: Branch count is omitted because MANAGE_BRANCHES is a business-level
      // capability and is filtered out from branch settings anyway

      // Map usage counts to capability keys
      const usageCounts: Record<string, number> = {
        MANAGE_EMPLOYEES: memberCount,
        MANAGE_PRODUCTS: productCount,
      }

      // Build entitlement details with category information from registry
      const entitlements: EntitlementDetail[] = subscription.plan.entitlements
        .map(ent => {
          const capabilityKey = ent.featureKey as CapabilityKey
          const override = overrideMap.get(ent.featureKey)
          const isEnabled = enabledCapabilities.has(ent.featureKey)

          // Check if enabled at branch level (defaults to true if no config exists)
          const isEnabledAtBranch = branchEnabledMap.get(capabilityKey) ?? true

          // Find category from CAPABILITY_REGISTRY
          const registryEntry = CAPABILITY_REGISTRY.find(c => c.id === capabilityKey)
          const category = registryEntry?.category ?? 'PLATFORM'

          // Check if this is a business-level capability
          const isBranchLevel = !BUSINESS_LEVEL_CAPABILITIES.has(capabilityKey)

          return {
            capabilityKey,
            featureLabel: ent.feature.label,
            featureDescription: ent.feature.description,
            isOperational: ent.feature.isOperational,
            category,
            isBranchLevel,
            usageLimit: ent.usageLimit,
            currentUsage: usageCounts[ent.featureKey] ?? null,
            isEnabled,
            isEnabledAtBranch,
            configs: capabilityConfigMap.get(capabilityKey) ?? [],
            hasOverride: !!override,
            overrideGranted: override?.granted ?? null,
            overrideExpiresAt: override?.expiresAt ?? null,
            overrideReason: override?.reason ?? null,
          }
        })
        // Filter: only show enabled capabilities that are branch-level
        .filter(ent => ent.isEnabled && ent.isBranchLevel)

      // Group entitlements by category
      const categoryMap = new Map<string, EntitlementDetail[]>()

      for (const ent of entitlements) {
        const existing = categoryMap.get(ent.category) ?? []
        existing.push(ent)
        categoryMap.set(ent.category, existing)
      }

      // Build category groups with labels and ordering
      const categoryGroups: CapabilityCategoryGroup[] = CATEGORY_ORDER.map(category => {
        const categoryEntitlements = categoryMap.get(category)
        if (!categoryEntitlements || categoryEntitlements.length === 0) return null

        return {
          category: category as string,
          categoryLabel: CATEGORY_LABELS[category] ?? category,
          isOperational: categoryEntitlements.some(e => e.isOperational),
          entitlements: categoryEntitlements,
        }
      }).filter((group): group is CapabilityCategoryGroup => group !== null)

      console.log('[fetchEntitlementDetails] Success! Returning', categoryGroups.length, 'category groups')
      return {
        planName: subscription.plan.name,
        status: subscription.status,
        billingModel: subscription.billingModel,
        includedTxPerMonth: subscription.plan.includedTxPerMonth,
        txUsedThisPeriod: txUsed,
        txRemaining,
        categoryGroups,
      }
    } catch (error) {
      console.error('[fetchEntitlementDetails] Error:', error)
      // Log the full error with stack trace
      if (error instanceof Error) {
        console.error('[fetchEntitlementDetails] Error message:', error.message)
        console.error('[fetchEntitlementDetails] Error stack:', error.stack)
      }
      // Return null instead of throwing to prevent page crash
      return null
    }
  })
