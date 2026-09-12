/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import {
  adminUserCollection,
  adminUserPermissionCollection,
  permissionCollection,
} from '@platform/db/collections'
import { and, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output types — mirror the server-fn shapes exactly
// ---------------------------------------------------------------------------

export interface AdminPermissionOverrideRow {
  id: string
  permissionId: string
  permission: {
    key: string
    name: string
    description: string | null
    scope: string
    action: string
    resource: string
  }
  grantedBy: string | null
  grantedAt: Date | null
  note: string | null
}

export interface AdminUserWithPermissionsRow {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  customGrants: AdminPermissionOverrideRow[]
  customRevokes: AdminPermissionOverrideRow[]
}

export interface AdminPermissionWithUsersRow {
  id: string
  key: string
  name: string
  description: string | null
  scope: string
  action: string
  resource: string
  category: string | null
  usersWithGrant: Array<{ id: string; name: string; email: string; role: string; grantedAt: Date | null; grantedBy: string | null; note: string | null }>
  usersWithRevoke: Array<{ id: string; name: string; email: string; role: string; grantedAt: Date | null; grantedBy: string | null; note: string | null }>
}

// ---------------------------------------------------------------------------
// fetchAdminUsersWithPermissions
// ---------------------------------------------------------------------------

export const fetchAdminUsersWithPermissions = () => {
  const users = useLiveQuery(
    q => q.from({ user: adminUserCollection }).orderBy(({ user }) => user.name, 'asc'),
    [],
  )

  const overrides = useLiveQuery(
    q => q.from({ override: adminUserPermissionCollection }),
    [],
  )

  const permissions = useLiveQuery(
    q => q.from({ perm: permissionCollection }),
    [],
  )

  // Build permission lookup map: id → permission
  const permMap = new Map<string, any>()
  for (const p of permissions.data ?? []) permMap.set(p.id, p)

  // Build overrides grouped by userId
  const grantsByUser = new Map<string, any[]>()
  const revokesByUser = new Map<string, any[]>()
  for (const o of overrides.data ?? []) {
    const userId = (o as any).userId as string
    const perm = permMap.get(o.permissionId)
    if (!perm) continue
    const row = {
      id: o.id,
      permissionId: o.permissionId,
      permission: { key: perm.key, name: perm.name, description: perm.description, scope: perm.scope, action: perm.action, resource: perm.resource },
      grantedBy: o.grantedBy ?? null,
      grantedAt: (o as any).grantedAt instanceof Date ? (o as any).grantedAt : null,
      note: (o as any).note ?? null,
    }
    if (o.granted) {
      if (!grantsByUser.has(userId)) grantsByUser.set(userId, [])
      grantsByUser.get(userId)!.push(row)
    } else {
      if (!revokesByUser.has(userId)) revokesByUser.set(userId, [])
      revokesByUser.get(userId)!.push(row)
    }
  }

  const data: AdminUserWithPermissionsRow[] = (users.data ?? [])
    .filter((u: any) => !u.deletedAt)
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as string,
      image: u.image ?? null,
      customGrants: grantsByUser.get(u.id) ?? [],
      customRevokes: revokesByUser.get(u.id) ?? [],
    }))

  return {
    data,
    isLoading: users.isLoading || overrides.isLoading || permissions.isLoading,
  }
}

// ---------------------------------------------------------------------------
// fetchAdminPermissionsWithUsers  (ADMIN scope only)
// ---------------------------------------------------------------------------

export interface FetchAdminPermissionsWithUsersProps {
  searchQuery?: string
}

export const fetchAdminPermissionsWithUsers = ({ searchQuery }: FetchAdminPermissionsWithUsersProps = {}) => {
  const permissionsAll = useLiveQuery(
    q =>
      q
        .from({ perm: permissionCollection })
        .where(({ perm }) => eq(perm.scope as any, 'ADMIN' as any))
        .orderBy(({ perm }) => perm.category, 'asc')
        .orderBy(({ perm }) => perm.name, 'asc'),
    [],
  )

  const permissionsFiltered = useLiveQuery(
    q =>
      q
        .from({ perm: permissionCollection })
        .where(({ perm }) =>
          and(
            eq(perm.scope as any, 'ADMIN' as any),
            searchQuery
              ? or(ilike(perm.name, `%${searchQuery}%`), ilike(perm.key, `%${searchQuery}%`))
              : undefined,
          ),
        )
        .orderBy(({ perm }) => perm.category, 'asc')
        .orderBy(({ perm }) => perm.name, 'asc'),
    [searchQuery],
  )

  const overrides = useLiveQuery(
    q => q.from({ override: adminUserPermissionCollection }),
    [],
  )

  const users = useLiveQuery(
    q => q.from({ user: adminUserCollection }),
    [],
  )

  const hasFilter = !!searchQuery
  const rawPerms = hasFilter ? permissionsFiltered : permissionsAll

  // Build user lookup
  const userMap = new Map<string, any>()
  for (const u of users.data ?? []) userMap.set(u.id, u)

  // Build overrides grouped by permissionId
  const grantsByPerm = new Map<string, any[]>()
  const revokesByPerm = new Map<string, any[]>()
  for (const o of overrides.data ?? []) {
    const userId = (o as any).userId as string
    const u = userMap.get(userId)
    if (!u) continue
    const entry = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as string,
      grantedAt: (o as any).grantedAt instanceof Date ? (o as any).grantedAt : null,
      grantedBy: o.grantedBy ?? null,
      note: (o as any).note ?? null,
    }
    if (o.granted) {
      if (!grantsByPerm.has(o.permissionId)) grantsByPerm.set(o.permissionId, [])
      grantsByPerm.get(o.permissionId)!.push(entry)
    } else {
      if (!revokesByPerm.has(o.permissionId)) revokesByPerm.set(o.permissionId, [])
      revokesByPerm.get(o.permissionId)!.push(entry)
    }
  }

  const data: AdminPermissionWithUsersRow[] = (rawPerms.data ?? []).map((p: any) => ({
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description ?? null,
    scope: p.scope as string,
    action: p.action as string,
    resource: p.resource,
    category: p.category ?? null,
    usersWithGrant: grantsByPerm.get(p.id) ?? [],
    usersWithRevoke: revokesByPerm.get(p.id) ?? [],
  }))

  return {
    data,
    isLoading: rawPerms.isLoading || overrides.isLoading || users.isLoading,
  }
}
