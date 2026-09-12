/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { adminUserCollection } from '@platform/db/collections'
import { and, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminAccountRow {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  emailVerified: boolean
  deletedAt: Date | null
  createdAt: Date | null
}

export interface FetchAdminAccountsProps {
  searchQuery?: string
  roleFilter?: string
}

// ---------------------------------------------------------------------------
// fetchAdminAccounts
// ---------------------------------------------------------------------------

export const fetchAdminAccounts = ({ searchQuery, roleFilter }: FetchAdminAccountsProps = {}) => {
  // ── No filters ────────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ user: adminUserCollection })
        .orderBy(({ user }) => user.name, 'asc')
        .select(({ user }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as string,
          image: user.image ?? null,
          emailVerified: user.emailVerified,
          deletedAt: (user as any).deletedAt ?? null,
          createdAt: (user as any).createdAt ?? null,
        })),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ user: adminUserCollection })
        .where(({ user }) =>
          and(
            searchQuery
              ? or(ilike(user.name, `%${searchQuery}%`), ilike(user.email, `%${searchQuery}%`))
              : undefined,
            roleFilter ? eq(user.role as any, roleFilter as any) : undefined,
          ),
        )
        .orderBy(({ user }) => user.name, 'asc')
        .select(({ user }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as string,
          image: user.image ?? null,
          emailVerified: user.emailVerified,
          deletedAt: (user as any).deletedAt ?? null,
          createdAt: (user as any).createdAt ?? null,
        })),
    [searchQuery, roleFilter],
  )

  const hasFilter = !!(searchQuery || roleFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: exclude soft-deleted, cast Date fields ────────────────
  const data: AdminAccountRow[] = (raw.data ?? [])
    .filter((u: any) => !(u as any).deletedAt)
    .map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? '',
      image: u.image ?? null,
      emailVerified: u.emailVerified ?? false,
      deletedAt: u.deletedAt instanceof Date ? u.deletedAt : null,
      createdAt: u.createdAt instanceof Date ? u.createdAt : null,
    }))

  return {
    data,
    isLoading: raw.isLoading,
    total: data.length,
  }
}
