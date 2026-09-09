/**
 * auth-setup.ts — Admin app auth wiring
 *
 * Minimal setup — no tenant data APIs, no offline collections, no event bus.
 * Only registers the auth user provider and platform auth client.
 */

import { registerPlatformAuthClient } from '@platform/lib/better-auth/create-auth-middleware'
import { authClient } from '@/lib/better-auth/auth-client'
import type { ServerUser } from '@/lib/better-auth/auth-server'
import { getAuthUser } from '@/lib/better-auth/auth-server'
import { registerAuthUserProvider } from '@/lib/better-auth/auth-store'

export function setupAuth(): void {
  registerAuthUserProvider(getAuthUser as () => Promise<ServerUser | undefined>)
  registerPlatformAuthClient(authClient)
}
