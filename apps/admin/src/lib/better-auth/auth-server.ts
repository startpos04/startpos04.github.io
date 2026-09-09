import { buildSummaryFromDatabase } from '@platform/lib/authorization/authorization-engine.server'
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from './auth'
import { authMiddleware } from './auth-middleware'

// ---------------------------------------------------------------------------
// getAuthUser — Admin auth context
//
// Reads from AdminSession/AdminUser — never touches the tenant User table.
// ---------------------------------------------------------------------------
export const getAuthUser = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) return undefined

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
