/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { billingPaymentCollection, businessCollection } from '@platform/db/collections'
import { and, eq, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminPayment {
  id: string
  businessId: string
  businessName: string
  amount: number
  currency: string
  paymentMethod: string
  periodsAdvancePaid: number
  providerReference: string | null
  proofImageUrl: string | null
  notes: string | null
  status: string
  subscriptionId: string | null
  createdAt: Date | null
}

export interface FetchPaymentsProps {
  /** When true, only return PENDING_APPROVAL rows (the review queue) */
  pendingOnly?: boolean
}

// ---------------------------------------------------------------------------
// Shared select shape
// ---------------------------------------------------------------------------

const selectPayment = ({ payment, business }: any) => ({
  id: payment.id,
  businessId: payment.businessId,
  businessName: business?.name ?? '—',
  amount: payment.amount,
  currency: payment.currency ?? 'PHP',
  paymentMethod: payment.paymentMethod as string,
  periodsAdvancePaid: payment.periodsAdvancePaid ?? 1,
  providerReference: payment.providerReference ?? null,
  proofImageUrl: payment.proofImageUrl ?? null,
  notes: payment.notes ?? null,
  status: payment.status as string,
  subscriptionId: payment.subscriptionId ?? null,
  createdAt: (payment as any).createdAt ?? null,
})

// ---------------------------------------------------------------------------
// fetchPayments
// ---------------------------------------------------------------------------

export const fetchPayments = ({ pendingOnly }: FetchPaymentsProps = {}) => {
  // ── All manual payments ──────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ payment: billingPaymentCollection })
        .leftJoin({ business: businessCollection }, ({ payment, business }) =>
          eq(payment.businessId, business.id),
        )
        .where(({ payment }) => eq(payment.provider as any, 'MANUAL' as any))
        .orderBy(({ payment }) => (payment as any).createdAt, 'asc')
        .select(selectPayment),
    [],
  )

  // ── Pending approval only ─────────────────────────────────────────────
  const resultPending = useLiveQuery(
    q =>
      q
        .from({ payment: billingPaymentCollection })
        .leftJoin({ business: businessCollection }, ({ payment, business }) =>
          eq(payment.businessId, business.id),
        )
        .where(({ payment }) =>
          and(
            eq(payment.provider as any, 'MANUAL' as any),
            eq(payment.status as any, 'PENDING_APPROVAL' as any),
          ),
        )
        .orderBy(({ payment }) => (payment as any).createdAt, 'asc')
        .select(selectPayment),
    [],
  )

  const raw = pendingOnly ? resultPending : resultAll

  const data: AdminPayment[] = (raw.data ?? []).map(p => ({
    id: p.id,
    businessId: p.businessId,
    businessName: p.businessName ?? '—',
    amount: p.amount,
    currency: p.currency ?? 'PHP',
    paymentMethod: p.paymentMethod ?? '',
    periodsAdvancePaid: p.periodsAdvancePaid ?? 1,
    providerReference: p.providerReference ?? null,
    proofImageUrl: p.proofImageUrl ?? null,
    notes: p.notes ?? null,
    status: p.status ?? '',
    subscriptionId: p.subscriptionId ?? null,
    createdAt: p.createdAt instanceof Date ? p.createdAt : null,
  }))

  return {
    data,
    isLoading: raw.isLoading,
    total: data.length,
  }
}
