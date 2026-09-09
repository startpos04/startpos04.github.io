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

export async function loginOnline(email: string, password: string, onSuccess: (user: ServerUser) => void): Promise<void> {
  const result = await authClient.signIn.email({ email, password })

  if (result?.error) {
    const message = result.error.message || 'Authentication failed'
    toast.error(message)
    throw new Error(message)
  }

  const fullUser = await getAuthUser()
  if (!fullUser) {
    toast.error('Login succeeded but your account could not be loaded.')
    throw new Error('Account profile could not be loaded.')
  }

  getQueryClient().resetQueries()
  onSuccess(fullUser)
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
