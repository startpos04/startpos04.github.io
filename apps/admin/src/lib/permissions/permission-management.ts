/**
 * permission-management.ts — Admin app permission management server functions
 *
 * Operates on AdminUser / AdminUserPermission / AdminRoleDefaultPermission.
 * All mutations require QA_ASSIGN_TEST permission (SUPERADMIN by default).
 *
 * Mirrors web app's permission-management.ts shape exactly.
 */

import { buildSummaryFromDatabase } from '@platform/lib/authorization/authorization-engine.server'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { getServerContext } from '@platform/lib/better-auth/server-context'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminPermissionDefinition {
  id: string
  key: string
  name: string
  description: string | null
  scope: string
  action: string
  resource: string
  category: string | null
}

/** Shape of a user grant/revoke row with permission details included */
interface AdminPermissionOverride {
  id: string
  permissionId: string
  permission: {
    id: string
    key: string
    name: string
    description: string | null
    scope: string
    action: string
    resource: string
  }
  grantedBy: string | null
  grantedAt: Date
  note: string | null
}

export interface AdminUserWithPermissions {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  customGrants: AdminPermissionOverride[]
  customRevokes: AdminPermissionOverride[]
}

/** A permission row enriched with which admin users have custom grants/revokes */
export interface AdminPermissionWithUsers {
  id: string
  key: string
  name: string
  description: string | null
  scope: string
  action: string
  resource: string
  category: string | null
  usersWithGrant: Array<{
    id: string
    name: string
    email: string
    role: string
    grantedAt: Date
    grantedBy: string | null
    note: string | null
  }>
  usersWithRevoke: Array<{
    id: string
    name: string
    email: string
    role: string
    grantedAt: Date
    grantedBy: string | null
    note: string | null
  }>
}

// ---------------------------------------------------------------------------
// Guard — caller must have QA_ASSIGN_TEST
// ---------------------------------------------------------------------------

async function requireAssignPermission(context: unknown) {
  const user = getServerContext(context).user
  if (!user?.id) throw new Error('UNAUTHENTICATED')
  const summary = await buildSummaryFromDatabase({
    userId: user.id,
    role: (user as { role?: string }).role ?? '',
  })
  if (!summary.permissions.includes(Permissions.QA_ASSIGN_TEST)) {
    throw new Error('You do not have permission to manage admin permissions.')
  }
  return user
}

// ---------------------------------------------------------------------------
// fetchAdminUsersWithPermissions
// ---------------------------------------------------------------------------

export const fetchAdminUsersWithPermissions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ users: AdminUserWithPermissions[] }> => {
    await requireAssignPermission(context)

    const users = await rootPrisma.adminUser.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true, image: true },
    })

    const overrides = await rootPrisma.adminUserPermission.findMany({
      where: { userId: { in: users.map(u => u.id) } },
      include: {
        permission: {
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            scope: true,
            action: true,
            resource: true,
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    })

    const byUser = new Map<string, { grants: typeof overrides; revokes: typeof overrides }>()
    for (const o of overrides) {
      if (!byUser.has(o.userId)) byUser.set(o.userId, { grants: [], revokes: [] })
      if (o.granted) byUser.get(o.userId)!.grants.push(o)
      else byUser.get(o.userId)!.revokes.push(o)
    }

    return {
      users: users.map(u => ({
        ...u,
        customGrants: (byUser.get(u.id)?.grants ?? []).map(g => ({
          id: g.id,
          permissionId: g.permissionId,
          permission: g.permission,
          grantedBy: g.grantedBy,
          grantedAt: g.grantedAt,
          note: g.note,
        })),
        customRevokes: (byUser.get(u.id)?.revokes ?? []).map(r => ({
          id: r.id,
          permissionId: r.permissionId,
          permission: r.permission,
          grantedBy: r.grantedBy,
          grantedAt: r.grantedAt,
          note: r.note,
        })),
      })),
    }
  })

// ---------------------------------------------------------------------------
// fetchAdminPermissionsWithUsers
// Mirror of web's fetchPermissionsWithEmployees — used by the Permissions tab
// and PermissionUsersSidebar.
// ---------------------------------------------------------------------------

export const fetchAdminPermissionsWithUsers = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ permissions: AdminPermissionWithUsers[] }> => {
    await requireAssignPermission(context)

    // Only ADMIN-scoped permissions
    const permissions = await rootPrisma.permission.findMany({
      where: { scope: 'ADMIN' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        scope: true,
        action: true,
        resource: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    // All admin user overrides with user details
    const overrides = await rootPrisma.adminUserPermission.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    })

    // Group by permissionId
    const byPermission = new Map<
      string,
      {
        grants: AdminPermissionWithUsers['usersWithGrant']
        revokes: AdminPermissionWithUsers['usersWithRevoke']
      }
    >()

    for (const o of overrides) {
      if (!byPermission.has(o.permissionId)) byPermission.set(o.permissionId, { grants: [], revokes: [] })
      const entry = {
        id: o.user.id,
        name: o.user.name,
        email: o.user.email,
        role: o.user.role,
        grantedAt: o.grantedAt,
        grantedBy: o.grantedBy,
        note: o.note,
      }
      if (o.granted) byPermission.get(o.permissionId)!.grants.push(entry)
      else byPermission.get(o.permissionId)!.revokes.push(entry)
    }

    return {
      permissions: permissions.map(p => ({
        ...p,
        usersWithGrant: byPermission.get(p.id)?.grants ?? [],
        usersWithRevoke: byPermission.get(p.id)?.revokes ?? [],
      })),
    }
  })

// ---------------------------------------------------------------------------
// fetchAdminPermissions — ADMIN-scoped definitions only (used by the dialog)
// ---------------------------------------------------------------------------

export const fetchAdminPermissions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ permissions: AdminPermissionDefinition[] }> => {
    await requireAssignPermission(context)

    const permissions = await rootPrisma.permission.findMany({
      where: { scope: 'ADMIN' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        scope: true,
        action: true,
        resource: true,
        category: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return { permissions }
  })

// ---------------------------------------------------------------------------
// grantAdminPermission
// ---------------------------------------------------------------------------

export const grantAdminPermission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string; permissionKey: string; reason?: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: boolean; message: string }> => {
    const caller = await requireAssignPermission(context)
    const { userId, permissionKey, reason } = data

    const targetUser = await rootPrisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) throw new Error('Admin user not found.')

    const permission = await rootPrisma.permission.findUnique({
      where: { key: permissionKey },
      select: { id: true, name: true },
    })
    if (!permission) throw new Error(`Permission "${permissionKey}" not found.`)

    await rootPrisma.adminUserPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      create: {
        userId,
        permissionId: permission.id,
        granted: true,
        grantedBy: caller.id,
        grantedAt: new Date(),
        note: reason ?? 'Granted by admin',
      },
      update: {
        granted: true,
        grantedBy: caller.id,
        grantedAt: new Date(),
        note: reason ?? 'Granted by admin',
      },
    })

    return {
      success: true,
      message: `Successfully granted "${permission.name}" to ${targetUser.name || targetUser.email}.`,
    }
  })

// ---------------------------------------------------------------------------
// revokeAdminPermission
// ---------------------------------------------------------------------------

export const revokeAdminPermission = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string; permissionKey: string; reason?: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: boolean; message: string }> => {
    const caller = await requireAssignPermission(context)
    const { userId, permissionKey, reason } = data

    const targetUser = await rootPrisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) throw new Error('Admin user not found.')

    const permission = await rootPrisma.permission.findUnique({
      where: { key: permissionKey },
      select: { id: true, name: true },
    })
    if (!permission) throw new Error(`Permission "${permissionKey}" not found.`)

    await rootPrisma.adminUserPermission.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      create: {
        userId,
        permissionId: permission.id,
        granted: false,
        grantedBy: caller.id,
        grantedAt: new Date(),
        note: reason ?? 'Revoked by admin',
      },
      update: {
        granted: false,
        grantedBy: caller.id,
        grantedAt: new Date(),
        note: reason ?? 'Revoked by admin',
      },
    })

    return {
      success: true,
      message: `Successfully revoked "${permission.name}" from ${targetUser.name || targetUser.email}.`,
    }
  })

// ---------------------------------------------------------------------------
// removeAdminPermissionOverride
// ---------------------------------------------------------------------------

export const removeAdminPermissionOverride = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string; permissionKey: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: boolean; message: string }> => {
    await requireAssignPermission(context)
    const { userId, permissionKey } = data

    const targetUser = await rootPrisma.adminUser.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    if (!targetUser) throw new Error('Admin user not found.')

    const permission = await rootPrisma.permission.findUnique({
      where: { key: permissionKey },
      select: { id: true, name: true },
    })
    if (!permission) throw new Error(`Permission "${permissionKey}" not found.`)

    try {
      await rootPrisma.adminUserPermission.delete({
        where: { userId_permissionId: { userId, permissionId: permission.id } },
      })
    } catch {
      // Record didn't exist — no-op, still success
    }

    return {
      success: true,
      message: `Removed override for "${permission.name}" from ${targetUser.name || targetUser.email}. Role defaults apply.`,
    }
  })
