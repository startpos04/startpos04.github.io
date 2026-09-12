/**
 * /invoices — Billing Invoice Viewer
 *
 * Local-first via fetchInvoices hook (billingInvoiceCollection).
 * Items and payments are pre-loaded in the hook — sidebar skips extra fetch.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Badge } from '@platform/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminInvoice } from '@/lib/queries/fetch-invoices'
import { fetchInvoices } from '@/lib/queries/fetch-invoices'
import type { InvoiceRow } from '@/lib/server-fn/invoices'
import { InvoiceDetailSidebar } from './-components/invoice-detail-sidebar'
import { closeInvoiceSidebar, INVOICE_ASIDE_ID, showInvoiceSidebar } from './-components/invoice-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/invoices/' as never)({
  component: InvoicesPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/40',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  PAID: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  VOID: 'bg-slate-100 text-slate-500 border-slate-200',
  UNCOLLECTIBLE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
}

const ALL_STATUSES = ['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']

function fmt(cents: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Adapter — AdminInvoice → InvoiceRow (for existing sidebar)
// ---------------------------------------------------------------------------

function toInvoiceRow(inv: AdminInvoice): InvoiceRow {
  return {
    id: inv.id,
    businessId: inv.businessId,
    businessName: inv.businessName,
    status: inv.status,
    subtotalAmount: inv.subtotalAmount,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
    billingPeriodStart: inv.billingPeriodStart?.toISOString() ?? '',
    billingPeriodEnd: inv.billingPeriodEnd?.toISOString() ?? '',
    externalInvoiceId: inv.externalInvoiceId,
    providerName: inv.providerName,
    dueAt: inv.dueAt?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt?.toISOString() ?? '',
    itemCount: inv.itemCount,
    paymentCount: inv.paymentCount,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call ─────────────────────────────────────────────────────────
  const { data, isLoading } = fetchInvoices({
    ...(search ? { searchQuery: search } : {}),
    ...(statusFilter ? { statusFilter } : {}),
  })

  const handleSelectRow = useCallback((invoice: AdminInvoice) => {
    setSelectedId(invoice.id)
    showInvoiceSidebar(
      <InvoiceDetailSidebar
        open
        invoice={toInvoiceRow(invoice)}
        onChanged={() => {
          /* collection re-syncs automatically */
        }}
        onClose={() => {
          setSelectedId('')
          closeInvoiceSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminInvoice>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('businessName', {
              header: 'Business',
              cell: (info: any) => {
                const inv: AdminInvoice = info.row.original
                return (
                  <div className='flex flex-col'>
                    <span className='font-medium text-foreground'>{info.getValue()}</span>
                    <span className='text-xs text-muted-foreground'>
                      {inv.billingPeriodStart ? dayjs(inv.billingPeriodStart).format('MMM D') : '—'}
                      {' – '}
                      {inv.billingPeriodEnd ? dayjs(inv.billingPeriodEnd).format('MMM D, YYYY') : '—'}
                    </span>
                  </div>
                )
              },
            }),

            h.accessor('status', {
              header: 'Status',
              maxSize: 120,
              cell: (info: any) => (
                <Badge variant='outline' className={`text-xs ${STATUS_COLORS[info.getValue() as string] ?? ''}`}>
                  {info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('totalAmount', {
              header: 'Total',
              maxSize: 110,
              cell: (info: any) => <span className='font-mono font-semibold tabular-nums'>{fmt(info.getValue() as number)}</span>,
            }),

            h.accessor('providerName', {
              header: 'Provider',
              maxSize: 100,
              cell: (info: any) => <span className='text-sm text-muted-foreground capitalize'>{info.getValue() ?? '—'}</span>,
            }),

            h.accessor('itemCount', {
              header: 'Items',
              maxSize: 70,
              cell: (info: any) => <span className='text-sm tabular-nums'>{info.getValue()}</span>,
            }),

            h.accessor('dueAt', {
              header: 'Due',
              maxSize: 120,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                if (!v) return <span className='text-xs text-muted-foreground'>—</span>
                const past = dayjs(v).isBefore(dayjs())
                const inv: AdminInvoice = info.row.original
                return (
                  <span className={`text-xs ${!inv.paidAt && past ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                    {dayjs(v).format('MMM D, YYYY')}
                  </span>
                )
              },
            }),

            h.accessor('paidAt', {
              header: 'Paid',
              maxSize: 120,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return v ? (
                  <span className='text-xs text-green-600 font-medium'>{dayjs(v).format('MMM D, YYYY')}</span>
                ) : (
                  <span className='text-xs text-muted-foreground'>—</span>
                )
              },
            }),

            h.accessor('createdAt', {
              header: 'Created',
              maxSize: 120,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return <span className='text-xs text-muted-foreground'>{v ? dayjs(v).format('MMM D, YYYY') : '—'}</span>
              },
            }),
          ] as ColumnDef<AdminInvoice, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_INVOICES}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Invoices</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>All billing invoices across every business.</p>
                <p className='text-xs text-muted-foreground'>
                  {isLoading ? 'Loading…' : `${data.length.toLocaleString()} invoice${data.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className='h-9 w-44 text-sm'>
                <SelectValue placeholder='All statuses' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All statuses</SelectItem>
                {ALL_STATUSES.map(s => (
                  <SelectItem key={s} value={s} className='text-xs'>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TableView<AdminInvoice>
            data={data}
            isFetching={isLoading}
            columns={columns}
            emptyMessage='No invoices found.'
            searchable={{ searchValue: search, onSearchChange: setSearch }}
            selectableRow={{ onClick: handleSelectRow, isSelected: row => row.id === selectedId }}
          />
        </div>

        <MountManager id={INVOICE_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
