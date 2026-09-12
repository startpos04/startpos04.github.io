import { buildSummaryFromDatabase } from '@platform/lib/authorization/authorization-engine.server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { authClient } from './auth-client'
import { authMiddleware } from './auth-middleware'

// ---------------------------------------------------------------------------
// getAuthUser — Admin auth context
//
// Reads from AdminSession/AdminUser — never touches the tenant User table.
// ---------------------------------------------------------------------------
export const getAuthUser = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const { data: session } = await authClient.getSession({
      fetchOptions: { headers: getRequest().headers },
    })

    if (!session?.user) {
      console.warn('[admin/getAuthUser] No session found')
      return undefined
    }

    console.info('[admin/getAuthUser] Session found for:', session.user.email)

    const authorization = await buildSummaryFromDatabase({
      userId: session.user.id,
      role: session.user.role ?? '',
    })

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
      role: session.user.role ?? null,
      authorization,
    }
  })

export type ServerUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>
