/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { businessCollection, businessSubscriptionCollection } from '@platform/db/collections'
import { and, eq, ilike, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminSubscription {
  id: string
  businessId: string
  businessName: string
  businessLogo: string | null
  status: string
  planId: string
  planName: null // SubscriptionPlan has no collection
  monthlyPrice: number // not in collection — always 0 in list, sidebar fetches real value
  billingModel: string
  trialEndsAt: Date | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  gracePeriodEndsAt: Date | null
  txUsedThisPeriod: number
  advancePaymentCredits: number
  advancePaymentExpiresAt: Date | null
  externalId: string | null
  cancelReason: string | null
  createdAt: Date | null
}

export interface FetchSubscriptionsProps {
  searchQuery?: string
  statusFilter?: string
}

// ---------------------------------------------------------------------------
// Shared select shape
// ---------------------------------------------------------------------------

const selectSub = ({ sub, business }: any) => ({
  id: sub.id,
  businessId: sub.businessId,
  businessName: business?.name ?? '—',
  businessLogo: business?.logo ?? null,
  status: sub.status as string,
  planId: sub.planId,
  planName: null as null,
  monthlyPrice: 0,
  billingModel: sub.billingModel as string,
  trialEndsAt: sub.trialEndsAt ?? null,
  currentPeriodStart: sub.currentPeriodStart ?? null,
  currentPeriodEnd: sub.currentPeriodEnd ?? null,
  gracePeriodEndsAt: sub.gracePeriodEndsAt ?? null,
  txUsedThisPeriod: sub.txUsedThisPeriod ?? 0,
  advancePaymentCredits: sub.advancePaymentCredits ?? 0,
  advancePaymentExpiresAt: sub.advancePaymentExpiresAt ?? null,
  externalId: sub.externalId ?? null,
  cancelReason: sub.cancelReason ?? null,
  createdAt: (sub as any).createdAt ?? null,
})

// ---------------------------------------------------------------------------
// fetchSubscriptions
// ---------------------------------------------------------------------------

export const fetchSubscriptions = ({ searchQuery, statusFilter }: FetchSubscriptionsProps) => {
  // ── No filters ────────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ sub: businessSubscriptionCollection })
        .leftJoin({ business: businessCollection }, ({ sub, business }) => eq(sub.businessId, business.id))
        .orderBy(({ business }) => business.name, 'asc')
        .select(selectSub),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ sub: businessSubscriptionCollection })
        .leftJoin({ business: businessCollection }, ({ sub, business }) => eq(sub.businessId, business.id))
        .where(({ sub, business }) =>
          and(searchQuery ? ilike(business.name, `%${searchQuery}%`) : undefined, statusFilter ? eq(sub.status as any, statusFilter as any) : undefined),
        )
        .orderBy(({ business }) => business.name, 'asc')
        .select(selectSub),
    [searchQuery, statusFilter],
  )

  const hasFilter = !!(searchQuery || statusFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: cast Date fields ──────────────────────────────────────
  const data: AdminSubscription[] = (raw.data ?? []).map(s => ({
    id: s.id,
    businessId: s.businessId,
    businessName: s.businessName ?? '—',
    businessLogo: s.businessLogo ?? null,
    status: s.status ?? '',
    planId: s.planId,
    planName: null,
    monthlyPrice: 0,
    billingModel: s.billingModel ?? '',
    txUsedThisPeriod: s.txUsedThisPeriod ?? 0,
    advancePaymentCredits: s.advancePaymentCredits ?? 0,
    externalId: s.externalId ?? null,
    cancelReason: s.cancelReason ?? null,
    trialEndsAt: s.trialEndsAt instanceof Date ? s.trialEndsAt : null,
    currentPeriodStart: s.currentPeriodStart instanceof Date ? s.currentPeriodStart : null,
    currentPeriodEnd: s.currentPeriodEnd instanceof Date ? s.currentPeriodEnd : null,
    gracePeriodEndsAt: s.gracePeriodEndsAt instanceof Date ? s.gracePeriodEndsAt : null,
    advancePaymentExpiresAt: s.advancePaymentExpiresAt instanceof Date ? s.advancePaymentExpiresAt : null,
    createdAt: s.createdAt instanceof Date ? s.createdAt : null,
  }))

  return {
    data,
    isLoading: raw.isLoading,
    total: data.length,
  }
}
