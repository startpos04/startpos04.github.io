/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { branchCollection, businessCollection, businessSubscriptionCollection, membershipCollection } from '@platform/db/collections'
import { and, count, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminBusiness {
  id: string
  name: string
  slug: string
  logo: string | null
  businessType: string
  countryCode: string
  registrationStatus: string
  createdAt: Date | null
  subscriptionStatus: string | null
  planId: string | null
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
  advancePaymentCredits: number
  txUsedThisPeriod: number
  branchCount: number
  memberCount: number
}

export interface FetchBusinessesProps {
  searchQuery?: string
  statusFilter?: string
}

// ---------------------------------------------------------------------------
// Shared select shape — used in both query variants below
// ---------------------------------------------------------------------------

const selectBusiness = ({ business, sub }: any) => ({
  id: business.id,
  name: business.name,
  slug: business.slug,
  logo: business.logo,
  businessType: business.businessType,
  countryCode: business.countryCode,
  registrationStatus: business.registrationStatus,
  createdAt: (business as any).createdAt ?? null,
  subscriptionStatus: sub?.status ?? null,
  planId: sub?.planId ?? null,
  trialEndsAt: sub?.trialEndsAt ?? null,
  currentPeriodEnd: sub?.currentPeriodEnd ?? null,
  advancePaymentCredits: sub?.advancePaymentCredits ?? 0,
  txUsedThisPeriod: sub?.txUsedThisPeriod ?? 0,
  branchCount: 0,
  memberCount: 0,
})

// ---------------------------------------------------------------------------
// fetchBusinesses
// ---------------------------------------------------------------------------

export const fetchBusinesses = ({ searchQuery, statusFilter }: FetchBusinessesProps) => {
  // ── Branch counts ──────────────────────────────────────────────────────
  const branchCounts = useLiveQuery(
    q =>
      q
        .from({ branch: branchCollection })
        .groupBy(({ branch }) => branch.businessId)
        .select(({ branch }) => ({ businessId: branch.businessId, total: count(branch.id) })),
    [],
  )

  // ── Member counts ──────────────────────────────────────────────────────
  const memberCounts = useLiveQuery(
    q =>
      q
        .from({ membership: membershipCollection })
        .groupBy(({ membership }) => membership.businessId)
        .select(({ membership }) => ({ businessId: membership.businessId, total: count(membership.id) })),
    [],
  )

  // ── Main: no filters ─────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ business: businessCollection })
        .leftJoin({ sub: businessSubscriptionCollection }, ({ business, sub }) => eq(business.id, sub.businessId))
        .orderBy(({ business }) => business.name, 'asc')
        .select(selectBusiness),
    [],
  )

  // ── Main: with filters ────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ business: businessCollection })
        .leftJoin({ sub: businessSubscriptionCollection }, ({ business, sub }) => eq(business.id, sub.businessId))
        .where(({ business, sub }) =>
          and(
            searchQuery ? or(ilike(business.name, `%${searchQuery}%`), ilike(business.slug, `%${searchQuery}%`)) : undefined,
            statusFilter ? eq(sub?.status as any, statusFilter as any) : undefined,
          ),
        )
        .orderBy(({ business }) => business.name, 'asc')
        .select(selectBusiness),
    [searchQuery, statusFilter],
  )

  const hasFilter = !!(searchQuery || statusFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: inject counts and cast enum fields ────────────────────
  const branchMap = new Map<string, number>()
  for (const r of branchCounts.data ?? []) branchMap.set(r.businessId, r.total)

  const memberMap = new Map<string, number>()
  for (const r of memberCounts.data ?? []) memberMap.set(r.businessId, r.total)

  const data: AdminBusiness[] = (raw.data ?? []).map(b => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: b.logo,
    businessType: b.businessType as string,
    countryCode: b.countryCode,
    registrationStatus: b.registrationStatus as string,
    subscriptionStatus: (b.subscriptionStatus as string) ?? null,
    planId: b.planId ?? null,
    advancePaymentCredits: b.advancePaymentCredits ?? 0,
    txUsedThisPeriod: b.txUsedThisPeriod ?? 0,
    branchCount: branchMap.get(b.id) ?? 0,
    memberCount: memberMap.get(b.id) ?? 0,
    createdAt: b.createdAt instanceof Date ? b.createdAt : null,
    trialEndsAt: b.trialEndsAt instanceof Date ? b.trialEndsAt : null,
    currentPeriodEnd: b.currentPeriodEnd instanceof Date ? b.currentPeriodEnd : null,
  }))

  return {
    data,
    isLoading: raw.isLoading || branchCounts.isLoading || memberCounts.isLoading,
    total: data.length,
  }
}
