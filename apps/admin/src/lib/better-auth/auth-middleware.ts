import type { PermissionKey } from '@platform/lib/authorization/permission-keys'
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from './auth'

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await auth.api.getSession({ headers: getRequest().headers })

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
      authorization: { permissions: [] as PermissionKey[], role: session.user.role ?? '' },
    },
  })
})
