/**
 * /payments — Manual Payment Review Queue
 *
 * Local-first via fetchPayments hook (billingPaymentCollection).
 * Shows only PENDING_APPROVAL manual payments.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Badge } from '@platform/components/ui/badge'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminPayment } from '@/lib/queries/fetch-payments'
import { fetchPayments } from '@/lib/queries/fetch-payments'
import type { ManualPaymentRow } from '@/lib/server-fn/manual-payments'
import { PaymentDetailSidebar } from './-components/payment-detail-sidebar'
import { closePaymentSidebar, PAYMENT_ASIDE_ID, showPaymentSidebar } from './-components/payment-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/payments/' as never)({
  component: PaymentsPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHOD_LABELS: Record<string, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  BANK_TRANSFER: 'Bank Transfer',
  GRABPAY: 'GrabPay',
  SHOPEE_PAY: 'ShopeePay',
  PAYMAYA: 'PayMaya',
  OTHER: 'Other',
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Adapter — AdminPayment → ManualPaymentRow (for existing sidebar)
// ---------------------------------------------------------------------------

function toManualPaymentRow(p: AdminPayment): ManualPaymentRow {
  return {
    id: p.id,
    businessId: p.businessId,
    businessName: p.businessName,
    amount: p.amount,
    currency: p.currency,
    paymentMethod: p.paymentMethod,
    periodsAdvancePaid: p.periodsAdvancePaid,
    providerReference: p.providerReference,
    proofImageUrl: p.proofImageUrl,
    notes: p.notes,
    subscriptionStatus: null,
    createdAt: p.createdAt?.toISOString() ?? '',
    status: p.status,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PaymentsPage() {
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — pending approval only ────────────────────────────────
  const { data, isLoading } = fetchPayments({ pendingOnly: true })

  const handleSelectRow = useCallback((payment: AdminPayment) => {
    setSelectedId(payment.id)
    showPaymentSidebar(
      <PaymentDetailSidebar
        payment={toManualPaymentRow(payment)}
        onReviewed={() => {
          /* collection re-syncs automatically */
        }}
        onClose={() => {
          setSelectedId('')
          closePaymentSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminPayment>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('businessName', {
              header: 'Business',
              cell: (info: any) => <span className='font-medium text-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('amount', {
              header: 'Amount',
              maxSize: 120,
              cell: (info: any) => <span className='font-semibold tabular-nums'>{formatAmount(info.getValue() as number, info.row.original.currency)}</span>,
            }),

            h.accessor('periodsAdvancePaid', {
              header: 'Periods',
              maxSize: 80,
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue() as number} mo.</span>,
            }),

            h.accessor('paymentMethod', {
              header: 'Method',
              maxSize: 120,
              cell: (info: any) => (
                <Badge variant='outline' className='text-xs'>
                  {METHOD_LABELS[info.getValue() as string] ?? info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('status', {
              header: 'Status',
              maxSize: 140,
              cell: (info: any) => (
                <Badge variant='outline' className='text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'>
                  {info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('createdAt', {
              header: 'Submitted',
              maxSize: 140,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return <span className='text-xs text-muted-foreground'>{v ? dayjs(v).fromNow() : '—'}</span>
              },
            }),
          ] as ColumnDef<AdminPayment, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_PAYMENTS}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Manual Payments</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Review and approve or reject manual payment submissions.</p>
                <p className='text-xs text-muted-foreground'>{isLoading ? 'Loading…' : `${data.length} pending review`}</p>
              </div>
            </div>
          </div>

          <TableView<AdminPayment>
            data={data}
            isFetching={isLoading}
            columns={columns}
            emptyMessage='No pending manual payments.'
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: row => row.id === selectedId,
            }}
          />
        </div>

        <MountManager id={PAYMENT_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
