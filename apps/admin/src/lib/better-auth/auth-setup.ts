/**
 * auth-setup.ts — Admin app auth wiring
 *
 * Registers the auth user provider, platform auth client, and the admin
 * crudAPI so that platform collections can sync via rootPrisma (unrestricted,
 * all tenants visible to admin).
 */

import { registerPlatformAuthClient } from '@platform/lib/better-auth/create-auth-middleware'
import { registerDataAPIs } from '@platform/lib/prisma-client/api-registry'
import { authClient } from '@/lib/better-auth/auth-client'
import type { ServerUser } from '@/lib/better-auth/auth-server'
import { getAuthUser } from '@/lib/better-auth/auth-server'
import { registerAuthUserProvider } from '@/lib/better-auth/auth-store'
import { crudAPI } from '@/lib/prisma-client/crud-api'

export function setupAuth(): void {
  registerAuthUserProvider(getAuthUser as () => Promise<ServerUser | undefined>)
  registerPlatformAuthClient(authClient)

  // Register the admin crudAPI (rootPrisma — no tenant scoping) so that
  // platform collections sync all-tenant data when used in the admin panel.
  // transactionAPI is stubbed — admin mutations go through explicit server-fns.
  registerDataAPIs({
    crudAPI: crudAPI as unknown as Parameters<typeof registerDataAPIs>[0]['crudAPI'],
    transactionAPI: {
      execute: async () => {
        throw new Error('[admin] Use explicit server-fns for mutations, not dbTransaction.')
      },
    },
  })
}
