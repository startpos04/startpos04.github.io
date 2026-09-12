/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { businessCollection, membershipCollection, sessionCollection, userCollection } from '@platform/db/collections'
import { and, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  emailVerified: boolean
  contactNumber: string | null
  deletedAt: Date | null
  createdAt: Date | null
  businessId: string | null
  businessName: string | null
  hasActiveSession: boolean
}

// ---------------------------------------------------------------------------
// fetchUsers — custom hook (same pattern as fetch-pos-products)
// ---------------------------------------------------------------------------

export interface FetchUsersProps {
  searchQuery?: string
  roleFilter?: string
}

export const fetchUsers = ({ searchQuery, roleFilter }: FetchUsersProps) => {
  // ── Active session user IDs ───────────────────────────────────────────
  const sessions = useLiveQuery(q => q.from({ session: sessionCollection }), [])

  // ── Base join: user ← membership → business ──────────────────────────
  // We build two variants — with and without .where() — to avoid passing
  // undefined to .where() when no filters are active (crashes the query builder).
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ user: userCollection })
        .leftJoin({ membership: membershipCollection }, ({ user, membership }) => eq(user.id, membership.userId))
        .leftJoin({ business: businessCollection }, ({ membership, business }) => eq(membership.businessId, business.id))
        .orderBy(({ user }) => user.name, 'asc')
        .select(({ user, membership, business }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          emailVerified: user.emailVerified,
          contactNumber: (user as any).contactNumber ?? null,
          deletedAt: (user as any).deletedAt ?? null,
          createdAt: (user as any).createdAt ?? null,
          businessId: membership?.businessId ?? null,
          businessName: business?.name ?? null,
        })),
    [],
  )

  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ user: userCollection })
        .leftJoin({ membership: membershipCollection }, ({ user, membership }) => eq(user.id, membership.userId))
        .leftJoin({ business: businessCollection }, ({ membership, business }) => eq(membership.businessId, business.id))
        .where(({ user }) =>
          and(
            searchQuery ? or(ilike(user.name, `%${searchQuery}%`), ilike(user.email, `%${searchQuery}%`)) : undefined,
            roleFilter ? eq(user.role as any, roleFilter as any) : undefined,
          ),
        )
        .orderBy(({ user }) => user.name, 'asc')
        .select(({ user, membership, business }) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
          emailVerified: user.emailVerified,
          contactNumber: (user as any).contactNumber ?? null,
          deletedAt: (user as any).deletedAt ?? null,
          createdAt: (user as any).createdAt ?? null,
          businessId: membership?.businessId ?? null,
          businessName: business?.name ?? null,
        })),
    [searchQuery, roleFilter],
  )

  // ── Pick the right result ─────────────────────────────────────────────
  const hasFilter = !!(searchQuery || roleFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: inject online status + dedup ──────────────────────────
  const onlineIds = new Set((sessions.data ?? []).map(s => s.userId))

  const seen = new Set<string>()
  const data: AdminUser[] = []

  for (const u of raw.data ?? []) {
    if (seen.has(u.id)) continue
    if ((u as any).deletedAt) continue // skip soft-deleted
    seen.add(u.id)
    data.push({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      image: u.image,
      emailVerified: u.emailVerified,
      contactNumber: u.contactNumber ?? null,
      deletedAt: u.deletedAt instanceof Date ? u.deletedAt : null,
      createdAt: u.createdAt instanceof Date ? u.createdAt : null,
      businessId: u.businessId ?? null,
      businessName: u.businessName ?? null,
      hasActiveSession: onlineIds.has(u.id),
    })
  }

  return {
    data,
    isLoading: raw.isLoading || sessions.isLoading,
    total: data.length,
  }
}
