/**
 * Subscription Invoices Tab
 *
 * Reads from billingInvoiceCollection (local-first, TanStack DB).
 * syncMode:'on-demand' — the collection populates on first online visit
 * and is cached in OPFS for offline reads thereafter.
 *
 * Architecture:
 *  - Online:  useLiveQuery reads from local cache (synced from server)
 *  - Offline: useLiveQuery reads from OPFS cache — same path, no branch needed
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { billingInvoiceCollection } from '@platform/db/collections'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import type { InvoiceStatus, InvoiceSummaryDTO } from '@/lib/billing/types'
import { invoiceCols } from '@/lib/columns/invoice-columns'

const columns = getColumns<InvoiceSummaryDTO>(h => [
  invoiceCols.invoiceNumber(h),
  invoiceCols.description(h),
  invoiceCols.invoiceDate(h),
  invoiceCols.dueDate(h),
  invoiceCols.invoiceStatus(h),
  invoiceCols.invoiceAmount(h),
  invoiceCols.downloadAction(h),
])

export function InvoicesTab() {
  const user = useAuthenticatedUser()

  const { data, isLoading } = useLiveQuery(
    q =>
      q
        .from({ inv: billingInvoiceCollection })
        .where(({ inv }) => eq(inv.businessId, user.business.id))
        .orderBy(({ inv }) => inv.billingPeriodStart, 'desc')
        .select(({ inv }) => inv),
    [user.business.id],
  )

  // Map raw BillingInvoice rows to InvoiceSummaryDTO.
  // hostedInvoiceUrl / pdfUrl are Stripe runtime fields not stored in the DB.
  const invoices: InvoiceSummaryDTO[] = (data ?? []).map(inv => ({
    id: inv.id,
    billingPeriodStart: inv.billingPeriodStart,
    billingPeriodEnd: inv.billingPeriodEnd,
    status: inv.status as InvoiceStatus,
    subtotalAmount: inv.subtotalAmount,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
    dueAt: inv.dueAt ?? null,
    paidAt: inv.paidAt ?? null,
    externalInvoiceId: inv.externalInvoiceId ?? null,
    hostedInvoiceUrl: null,
    pdfUrl: null,
  }))

  return (
    <div className='px-4 py-1 flex flex-col grow'>
      <TableView
        data={invoices}
        columns={columns}
        isFetching={isLoading}
        emptyMessage='No invoices found. Invoices will appear here once you have active billing.'
      />
    </div>
  )
}
