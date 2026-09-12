/**
 * platform-config.ts — Admin server functions for feature flags and system config
 *
 * Features use coreAPI (PLATFORM_MODELS — no businessId/branchId).
 * ConfigurationDefinitions use rootPrisma (platform-global config defaults).
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------

export interface FeatureRow {
  id: string
  key: string
  label: string
  description: string | null
  isOperational: boolean
  isSelectableByCustomer: boolean
  pricingCategory: string | null
  sortOrder: number
}

export const listFeatures = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<FeatureRow[]> => {
    const features = await rootPrisma.feature.findMany({
      orderBy: [{ pricingCategory: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        isOperational: true,
        isSelectableByCustomer: true,
        pricingCategory: true,
        sortOrder: true,
      },
    })
    return features.map(f => ({ ...f, pricingCategory: f.pricingCategory ?? null }))
  })

export const updateFeature = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string; isOperational?: boolean; isSelectableByCustomer?: boolean; label?: string; description?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.feature.update({
      where: { id: data.id },
      data: {
        ...(data.isOperational !== undefined ? { isOperational: data.isOperational } : {}),
        ...(data.isSelectableByCustomer !== undefined ? { isSelectableByCustomer: data.isSelectableByCustomer } : {}),
        ...(data.label ? { label: data.label } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    })
    return { success: true, message: 'Feature updated.' }
  })

// ---------------------------------------------------------------------------
// System Config Definitions
// ---------------------------------------------------------------------------

export interface ConfigDefRow {
  id: string
  key: string
  label: string
  description: string | null
  category: string
  dataType: string
  defaultValue: string
  scope: string
  required: boolean
  countryCode: string | null
  validation: unknown
}

export const listConfigDefinitions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const defs = await rootPrisma.configurationDefinition.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
    return defs.map(d => ({
      id: d.id,
      key: d.key,
      label: d.label,
      description: d.description,
      category: d.category,
      dataType: d.dataType,
      defaultValue: d.defaultValue,
      scope: d.scope,
      required: d.required,
      countryCode: d.countryCode,
      validation: d.validation,
    }))
  })

export const updateConfigDefault = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { key: string; defaultValue: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.configurationDefinition.update({
      where: { key: data.key as any },
      data: { defaultValue: data.defaultValue },
    })
    return { success: true, message: `Default for "${data.key}" updated to "${data.defaultValue}".` }
  })
