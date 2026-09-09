/**
 * auth-store.ts — Admin app auth store
 *
 * Minimal wrapper — no tenant, no entitlement, no business/branch context.
 * ServerUser is just the authenticated user with role + authorization summary.
 */

import {
  authStore as _authStore,
  getAuthenticatedUser as _getAuthenticatedUser,
  refreshUser as _refreshUser,
  registerAuthUserProvider as _registerAuthUserProvider,
  setUser as _setUser,
  useAuthenticatedUser as _useAuthenticatedUser,
  type AuthorizationSummary,
} from '@platform/lib/better-auth/auth-store'
import type { Store } from '@tanstack/react-store'
import type { ServerUser } from '@/lib/better-auth/auth-server'

export type { AuthorizationSummary }

type AppAuthState =
  | { isAuthenticated: false; isLoggingOut: boolean; user: null; authorization: AuthorizationSummary | null }
  | { isAuthenticated: true; isLoggingOut: boolean; user: ServerUser; authorization: AuthorizationSummary | null }

export const authStore = _authStore as unknown as Store<AppAuthState>

export const setUser = (user: ServerUser, authorization?: AuthorizationSummary | null) => _setUser(user, authorization)

export const refreshUser = (user: ServerUser, authorization?: AuthorizationSummary | null) => _refreshUser(user, authorization)

export const getAuthenticatedUser = (): ServerUser => _getAuthenticatedUser<ServerUser>()

export const useAuthenticatedUser = (): ServerUser => _useAuthenticatedUser<ServerUser>()

export const registerAuthUserProvider = (provider: () => Promise<ServerUser | undefined>): void =>
  _registerAuthUserProvider(provider as Parameters<typeof _registerAuthUserProvider>[0])

export const refreshAuthUser = async (): Promise<void> => {
  const { getAuthUser } = await import('@/lib/better-auth/auth-server')
  try {
    const freshUser = await getAuthUser()
    if (freshUser) refreshUser(freshUser, freshUser.authorization ?? null)
  } catch (err) {
    console.warn('[authStore] refreshAuthUser failed:', err)
  }
}
