/**
 * RequireAdminPermission
 *
 * Wraps a page or section and shows an "Access denied" message
 * if the logged-in admin lacks the required permission.
 *
 * Usage:
 *   <RequireAdminPermission permission={Permissions.ADMIN_VIEW_USERS}>
 *     <UsersPage />
 *   </RequireAdminPermission>
 */

import type { PermissionKey } from '@platform/lib/authorization/permission-keys'
import type { ReactNode } from 'react'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'

interface Props {
  permission: PermissionKey
  children: ReactNode
  /** Optional custom message shown instead of the default one */
  message?: string
}

export function RequireAdminPermission({ permission, children, message }: Props) {
  const user = useAuthenticatedUser()
  const perms =
    (user as { authorization?: { permissions?: string[] } } | null)
      ?.authorization?.permissions ?? []

  if (!perms.includes(permission)) {
    return (
      <div className='flex items-center justify-center h-full'>
        <div className='text-center text-muted-foreground max-w-sm'>
          <div className='text-4xl mb-4'>🔒</div>
          <p className='text-sm font-semibold text-foreground'>Access denied</p>
          <p className='text-xs mt-1'>
            {message ?? `You need the "${permission}" permission to view this page.`}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
