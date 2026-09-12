/**
 * auth-engine.ts — Admin app auth engine
 *
 * Online-only. No offline cache, no tenant switching, no local auth collection.
 */

import { resetAuth } from '@platform/lib/better-auth/auth-store'
import MountManager from '@platform/lib/mount-manager'
import { getQueryClient } from '@platform/lib/query-client'
import { toast } from 'sonner'
import { authClient } from './auth-client'
import type { ServerUser } from './auth-server'
import { getAuthUser } from './auth-server'
import { setUser } from './auth-store'

export async function loginOnline(email: string, password: string, onSuccess: (user: ServerUser) => void): Promise<void> {
  const result = await authClient.signIn.email({ email, password })

  if (result?.error) {
    const message = result.error.message || 'Authentication failed'
    toast.error(message)
    throw new Error(message)
  }

  if (!result?.data?.user) {
    toast.error('Login succeeded but your account could not be loaded.')
    throw new Error('Account profile could not be loaded.')
  }

  // Optimistically set the user in the auth store from the sign-in response
  // so the private route guard doesn't redirect back to login while getAuthUser resolves.
  const signedInUser = result.data.user
  const optimisticUser: ServerUser = {
    id: signedInUser.id,
    name: signedInUser.name,
    email: signedInUser.email,
    image: signedInUser.image ?? null,
    role: ((signedInUser as Record<string, unknown>).role as string) ?? null,
    authorization: {
      permissions: [],
      role: ((signedInUser as Record<string, unknown>).role as string) ?? '',
      customGrants: [],
      customRevokes: [],
    },
  }
  setUser(optimisticUser, optimisticUser.authorization)

  // Fetch the full user (with permissions) in the background and refresh the store
  getAuthUser()
    .then(fullUser => {
      if (fullUser) setUser(fullUser, fullUser.authorization)
    })
    .catch(err => {
      console.warn('[loginOnline] getAuthUser refresh failed:', err)
    })

  getQueryClient().resetQueries()
  onSuccess(optimisticUser)
}

export async function logout(params: { onSuccess: () => void }): Promise<void> {
  MountManager.clear()
  try {
    await authClient.signOut()
  } catch (error) {
    console.error('[AuthEngine] signOut failed:', error)
  }
  resetAuth()
  params.onSuccess()
}

export const AuthEngine = { loginOnline, logout }
