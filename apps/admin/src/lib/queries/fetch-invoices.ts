/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { billingInvoiceCollection, billingInvoiceItemCollection, billingPaymentCollection, businessCollection } from '@platform/db/collections'
import { and, eq, ilike, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface AdminInvoiceItem {
  id: string
  type: string
  description: string
  quantity: number
  unitAmount: number
  lineAmount: number
}

export interface AdminInvoicePayment {
  id: string
  provider: string
  paymentMethod: string
  amount: number
  status: string
  createdAt: Date | null
}

export interface AdminInvoice {
  id: string
  businessId: string
  businessName: string
  status: string
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  billingPeriodStart: Date | null
  billingPeriodEnd: Date | null
  externalInvoiceId: string | null
  providerName: string | null
  dueAt: Date | null
  paidAt: Date | null
  createdAt: Date | null
  itemCount: number
  paymentCount: number
  items: AdminInvoiceItem[]
  payments: AdminInvoicePayment[]
}

export interface FetchInvoicesProps {
  searchQuery?: string
  statusFilter?: string
}

// ---------------------------------------------------------------------------
// fetchInvoices
// ---------------------------------------------------------------------------

export const fetchInvoices = ({ searchQuery, statusFilter }: FetchInvoicesProps = {}) => {
  // ── All invoices ──────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ invoice: billingInvoiceCollection })
        .leftJoin({ business: businessCollection }, ({ invoice, business }) => eq(invoice.businessId, business.id))
        .orderBy(({ invoice }) => (invoice as any).createdAt, 'desc')
        .select(({ invoice, business }) => ({
          id: invoice.id,
          businessId: invoice.businessId,
          businessName: business?.name ?? '—',
          status: invoice.status as string,
          subtotalAmount: invoice.subtotalAmount ?? 0,
          taxAmount: invoice.taxAmount ?? 0,
          totalAmount: invoice.totalAmount ?? 0,
          billingPeriodStart: invoice.billingPeriodStart ?? null,
          billingPeriodEnd: invoice.billingPeriodEnd ?? null,
          externalInvoiceId: invoice.externalInvoiceId ?? null,
          providerName: invoice.providerName ?? null,
          dueAt: invoice.dueAt ?? null,
          paidAt: invoice.paidAt ?? null,
          createdAt: (invoice as any).createdAt ?? null,
        })),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ invoice: billingInvoiceCollection })
        .leftJoin({ business: businessCollection }, ({ invoice, business }) => eq(invoice.businessId, business.id))
        .where(({ invoice, business }) =>
          and(searchQuery ? ilike(business.name, `%${searchQuery}%`) : undefined, statusFilter ? eq(invoice.status as any, statusFilter as any) : undefined),
        )
        .orderBy(({ invoice }) => (invoice as any).createdAt, 'desc')
        .select(({ invoice, business }) => ({
          id: invoice.id,
          businessId: invoice.businessId,
          businessName: business?.name ?? '—',
          status: invoice.status as string,
          subtotalAmount: invoice.subtotalAmount ?? 0,
          taxAmount: invoice.taxAmount ?? 0,
          totalAmount: invoice.totalAmount ?? 0,
          billingPeriodStart: invoice.billingPeriodStart ?? null,
          billingPeriodEnd: invoice.billingPeriodEnd ?? null,
          externalInvoiceId: invoice.externalInvoiceId ?? null,
          providerName: invoice.providerName ?? null,
          dueAt: invoice.dueAt ?? null,
          paidAt: invoice.paidAt ?? null,
          createdAt: (invoice as any).createdAt ?? null,
        })),
    [searchQuery, statusFilter],
  )

  // ── All line items and payments — for counts + sidebar detail ─────────
  const allItems = useLiveQuery(q => q.from({ item: billingInvoiceItemCollection }), [])

  const allPayments = useLiveQuery(q => q.from({ payment: billingPaymentCollection }), [])

  const hasFilter = !!(searchQuery || statusFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: build lookup maps then assemble AdminInvoice[] ────────
  const itemsByInvoice = new Map<string, AdminInvoiceItem[]>()
  for (const item of allItems.data ?? []) {
    const invoiceId = (item as any).invoiceId as string | undefined
    if (!invoiceId) continue
    if (!itemsByInvoice.has(invoiceId)) itemsByInvoice.set(invoiceId, [])
    itemsByInvoice.get(invoiceId)!.push({
      id: item.id,
      type: item.type as string,
      description: item.description,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      lineAmount: item.lineAmount,
    })
  }

  const paymentsByInvoice = new Map<string, AdminInvoicePayment[]>()
  for (const p of allPayments.data ?? []) {
    const invoiceId = (p as any).invoiceId as string | undefined
    if (!invoiceId) continue
    if (!paymentsByInvoice.has(invoiceId)) paymentsByInvoice.set(invoiceId, [])
    paymentsByInvoice.get(invoiceId)!.push({
      id: p.id,
      provider: p.provider as string,
      paymentMethod: p.paymentMethod as string,
      amount: p.amount,
      status: p.status as string,
      createdAt: (p as any).createdAt instanceof Date ? (p as any).createdAt : null,
    })
  }

  const data: AdminInvoice[] = (raw.data ?? []).map(inv => {
    const i = inv as any
    return {
      id: i.id ?? '',
      businessId: i.businessId ?? '',
      businessName: i.businessName ?? '—',
      status: i.status ?? '',
      subtotalAmount: i.subtotalAmount ?? 0,
      taxAmount: i.taxAmount ?? 0,
      totalAmount: i.totalAmount ?? 0,
      billingPeriodStart: i.billingPeriodStart instanceof Date ? i.billingPeriodStart : null,
      billingPeriodEnd: i.billingPeriodEnd instanceof Date ? i.billingPeriodEnd : null,
      externalInvoiceId: i.externalInvoiceId ?? null,
      providerName: i.providerName ?? null,
      dueAt: i.dueAt instanceof Date ? i.dueAt : null,
      paidAt: i.paidAt instanceof Date ? i.paidAt : null,
      createdAt: i.createdAt instanceof Date ? i.createdAt : null,
      itemCount: itemsByInvoice.get(i.id ?? '')?.length ?? 0,
      paymentCount: paymentsByInvoice.get(i.id ?? '')?.length ?? 0,
      items: itemsByInvoice.get(i.id ?? '') ?? [],
      payments: paymentsByInvoice.get(i.id ?? '') ?? [],
    }
  })

  return {
    data,
    isLoading: raw.isLoading || allItems.isLoading || allPayments.isLoading,
    total: data.length,
  }
}
