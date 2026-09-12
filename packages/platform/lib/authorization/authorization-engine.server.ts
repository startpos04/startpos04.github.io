/**
 * authorization-engine.server.ts - Server-only authorization functions
 *
 * Handles both tenant users (User / UserPermission) and admin app users
 * (AdminUser / AdminUserPermission / AdminRoleDefaultPermission).
 *
 * Admin roles:  SUPERADMIN | TESTER | SUPPORT | FINANCE | DEVELOPER
 * Tenant roles: OWNER | ADMIN | SUPERVISOR | CASHIER | SERVICE_PROVIDER
 *
 * NEVER import this file in client code.
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import type { AuthorizationContext, PermissionSummary } from './authorization-engine'
import type { PermissionKey } from './permission-keys'
import { getDefaultPermissionsForRole } from './role-permissions'

const ADMIN_ROLES = new Set(['SUPERADMIN', 'TESTER', 'SUPPORT', 'FINANCE', 'DEVELOPER'])

/**
 * Build a complete permission summary by querying the database directly.
 *
 * For admin roles, reads from admin_role_default_permissions and
 * admin_user_permissions. For tenant roles, reads from the standard
 * user_permissions table.
 */
export async function buildSummaryFromDatabase(ctx: AuthorizationContext): Promise<PermissionSummary> {
  const now = new Date()

  if (ADMIN_ROLES.has(ctx.role)) {
    // ── Admin user path ────────────────────────────────────────────────────

    // Role defaults come from adminRoleDefaultPermission rows (seeded via permissions seeder)
    const adminRoleDefaults = await rootPrisma.adminRoleDefaultPermission.findMany({
      where: { role: ctx.role as any },
      include: { permission: { select: { key: true } } },
    })
    const roleDefaultKeys = adminRoleDefaults.map(r => r.permission.key as PermissionKey)

    // Per-user overrides (custom grants / revokes)
    const userOverrides = await rootPrisma.adminUserPermission.findMany({
      where: {
        userId: ctx.userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { permission: { select: { key: true } } },
    })

    const grants = userOverrides.filter(u => u.granted).map(u => u.permission.key as PermissionKey)
    const revokes = userOverrides.filter(u => !u.granted).map(u => u.permission.key as PermissionKey)

    const finalPermissions = new Set<PermissionKey>([...roleDefaultKeys, ...grants])
    revokes.forEach(p => finalPermissions.delete(p))

    return {
      permissions: Array.from(finalPermissions),
      role: ctx.role,
      customGrants: grants.filter(p => !roleDefaultKeys.includes(p)),
      customRevokes: revokes.filter(p => roleDefaultKeys.includes(p)),
    }
  }

  // ── Tenant user path ───────────────────────────────────────────────────

  const roleDefaults = getDefaultPermissionsForRole(ctx.role)

  const dbUserPermissions = await rootPrisma.userPermission.findMany({
    where: {
      userId: ctx.userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { permissionId: true, granted: true },
  })

  const dbPermissions = await rootPrisma.permission.findMany({
    select: { id: true, key: true },
  })
  const permissionMap = new Map(dbPermissions.map(p => [p.id, p.key]))

  const grants = dbUserPermissions
    .filter(up => up.granted)
    .map(up => permissionMap.get(up.permissionId) as PermissionKey)
    .filter(Boolean)

  const revokes = dbUserPermissions
    .filter(up => !up.granted)
    .map(up => permissionMap.get(up.permissionId) as PermissionKey)
    .filter(Boolean)

  const finalPermissions = new Set<PermissionKey>([...roleDefaults, ...grants])
  revokes.forEach(p => finalPermissions.delete(p))

  return {
    permissions: Array.from(finalPermissions),
    role: ctx.role,
    customGrants: grants.filter(p => !roleDefaults.includes(p)),
    customRevokes: revokes.filter(p => roleDefaults.includes(p)),
  }
}
