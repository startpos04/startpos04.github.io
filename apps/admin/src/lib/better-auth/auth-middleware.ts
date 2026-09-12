import type { PermissionKey } from '@platform/lib/authorization/permission-keys'
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { authClient } from './auth-client'

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: getRequest().headers,
    },
  })

  if (!session?.user) {
    return await next({
      context: {
        user: null,
        authorization: { permissions: [] as PermissionKey[], role: '' },
      },
    })
  }

  return await next({
    context: {
      user: session.user,
      authorization: { permissions: [] as PermissionKey[], role: ((session.user as Record<string, unknown>).role as string) ?? '' },
    },
  })
})
