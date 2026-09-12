/**
 * crud-api.ts — Admin app crudAPI
 *
 * Uses rootPrisma (unrestricted — no businessId/branchId tenant scoping).
 * This allows collections to sync ALL records across all tenants, which is
 * exactly what the admin panel needs.
 *
 * Registered via registerDataAPIs() in auth-setup.ts so the platform's
 * db/index.tsx collection layer can call it for queryFn / onInsert / onUpdate.
 *
 * NOTE: Write operations (onInsert/onUpdate/onDelete) on collections will also
 * go through rootPrisma — admin pages should prefer explicit server-fns for
 * mutations; collection-based writes are a fallback.
 */

/** biome-ignore-all lint/suspicious/noExplicitAny: proxy pattern */

import { type CrudProxy, type DBPayload, executeOperation } from '@platform/lib/prisma-client/crud-api'
import { createServerFn } from '@tanstack/react-start'
import { err, ok, ResultAsync } from 'neverthrow'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'

// ---------------------------------------------------------------------------
// Admin crudAPI server function — rootPrisma, no tenant scope
// ---------------------------------------------------------------------------

const adminCrudServerFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: DBPayload) => d)
  .handler(async ({ data }): Promise<{ value: any } | { error: any }> => {
    const result = await ResultAsync.fromPromise(
      executeOperation(rootPrisma, data),
      (e: any) => (e instanceof Error ? e.message : 'Database operation failed'),
    )
    return result.isOk() ? { value: result.value } : { error: result.error }
  })

// ---------------------------------------------------------------------------
// Public typed proxy — same interface as web's crudAPI
// ---------------------------------------------------------------------------

export const crudAPI = new Proxy({} as CrudProxy, {
  get(_, table: string) {
    return async (action: string, args: any) => {
      const response = await adminCrudServerFn({ data: { table, action, args } })
      if ('error' in response) return err(response.error as string)
      return ok(response.value as any)
    }
  },
})
