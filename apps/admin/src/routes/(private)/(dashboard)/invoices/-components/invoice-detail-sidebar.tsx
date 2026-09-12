/**
 * InvoiceDetailSidebar
 *
 * Shows full invoice detail: line items, linked payments, status change.
 * Mirrors web EmployeeDetailsSidebar structure.
 */

import Tab from '@platform/components/custom/tab'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import dayjs from '@platform/lib/dayjs'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { InvoiceDetail, InvoiceRow } from '@/lib/server-fn/invoices'
import { getInvoiceDetail, updateInvoiceStatus } from '@/lib/server-fn/invoices'
import { closeInvoiceSidebar } from './invoice-sidebar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/40',
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  PAID: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  VOID: 'bg-slate-100 text-slate-500 border-slate-200',
  UNCOLLECTIBLE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  SUCCEEDED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ invoice }: { invoice: InvoiceRow; detail: InvoiceDetail | null }) {
  return (
    <div className='space-y-4'>
      {/* Totals */}
      <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Subtotal</span>
          <span className='font-mono'>{fmt(invoice.subtotalAmount)}</span>
        </div>
        {invoice.taxAmount > 0 && (
          <>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Tax</span>
              <span className='font-mono'>{fmt(invoice.taxAmount)}</span>
            </div>
          </>
        )}
        <Separator />
        <div className='flex justify-between font-semibold'>
          <span>Total</span>
          <span className='font-mono text-base'>{fmt(invoice.totalAmount)}</span>
        </div>
      </div>

      {/* Meta */}
      <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Billing period</span>
          <span className='text-xs'>
            {dayjs(invoice.billingPeriodStart).format('MMM D')} – {dayjs(invoice.billingPeriodEnd).format('MMM D, YYYY')}
          </span>
        </div>
        {invoice.dueAt && (
          <>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Due</span>
              <span className='text-xs'>{dayjs(invoice.dueAt).format('MMM D, YYYY')}</span>
            </div>
          </>
        )}
        {invoice.paidAt && (
          <>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Paid</span>
              <span className='text-xs text-green-600 font-medium'>{dayjs(invoice.paidAt).format('MMM D, YYYY')}</span>
            </div>
          </>
        )}
        {invoice.providerName && (
          <>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Provider</span>
              <span className='capitalize text-xs'>{invoice.providerName}</span>
            </div>
          </>
        )}
        {invoice.externalInvoiceId && (
          <>
            <Separator />
            <div className='flex justify-between gap-3'>
              <span className='text-muted-foreground shrink-0'>External ID</span>
              <span className='text-xs font-mono truncate'>{invoice.externalInvoiceId}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Line items tab
// ---------------------------------------------------------------------------

function LineItemsTab({ detail }: { detail: InvoiceDetail | null }) {
  if (!detail) return <div className='py-8 text-center text-sm text-muted-foreground'>Loading…</div>
  if (!detail.items.length) return <div className='py-8 text-center text-sm text-muted-foreground'>No line items.</div>

  return (
    <div className='rounded-lg border overflow-hidden divide-y'>
      {detail.items.map(item => (
        <div key={item.id} className='px-4 py-3 text-sm'>
          <div className='flex justify-between items-start gap-3'>
            <div className='flex-1 min-w-0'>
              <p className='font-medium'>{item.description}</p>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {item.quantity} × {fmt(item.unitAmount)}{' '}
                <Badge variant='outline' className='ml-1 text-[10px] py-0 h-4'>
                  {item.type}
                </Badge>
              </p>
            </div>
            <span className='font-mono font-semibold shrink-0'>{fmt(item.lineAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payments tab
// ---------------------------------------------------------------------------

function PaymentsTab({ detail }: { detail: InvoiceDetail | null }) {
  if (!detail) return <div className='py-8 text-center text-sm text-muted-foreground'>Loading…</div>
  if (!detail.payments.length) return <div className='py-8 text-center text-sm text-muted-foreground'>No payments linked.</div>

  return (
    <div className='space-y-2'>
      {detail.payments.map(p => (
        <div key={p.id} className='rounded-lg border bg-card p-3 text-sm'>
          <div className='flex justify-between items-center'>
            <div>
              <p className='font-medium'>{fmt(p.amount)}</p>
              <p className='text-xs text-muted-foreground capitalize'>
                {p.provider.toLowerCase()} · {p.paymentMethod.replace(/_/g, ' ')}
              </p>
            </div>
            <div className='flex flex-col items-end gap-1'>
              <Badge variant='outline' className={`text-xs ${PAYMENT_STATUS_COLORS[p.status] ?? ''}`}>
                {p.status}
              </Badge>
              <span className='text-[10px] text-muted-foreground'>{dayjs(p.createdAt).fromNow()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component — mirrors EmployeeDetailsSidebar
// ---------------------------------------------------------------------------

interface Props {
  open?: boolean
  invoice: InvoiceRow
  onClose?: () => void
  onChanged?: () => void
}

const EDITABLE_STATUSES = ['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']

export function InvoiceDetailSidebar({ invoice, onClose, onChanged }: Props) {
  const handleClose = onClose ?? closeInvoiceSidebar
  const [detail, setDetail] = useState<InvoiceDetail | null>(null)
  const [statusTarget, setStatusTarget] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(getInvoiceDetail as any)({ data: { invoiceId: invoice.id } })
      .then((d: InvoiceDetail | null) => setDetail(d))
      .catch(() => {})
  }, [invoice.id])

  const handleUpdateStatus = async () => {
    if (!statusTarget) return
    setSaving(true)
    try {
      const r = (await updateInvoiceStatus({ data: { invoiceId: invoice.id, status: statusTarget } })) as any
      toast.success(r.message)
      setStatusTarget('')
      onChanged?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div>
          <h2 className='text-base font-semibold leading-tight'>{invoice.businessName}</h2>
          <div className='flex gap-1.5 mt-1 flex-wrap'>
            <Badge variant='outline' className={`text-[10px] py-0 h-4 ${STATUS_COLORS[invoice.status] ?? ''}`}>
              {invoice.status}
            </Badge>
            <Badge variant='outline' className='text-[10px] py-0 h-4 font-mono'>
              {fmt(invoice.totalAmount)}
            </Badge>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        <Tab
          defaultValue='Overview'
          tabs={[
            { label: 'Overview', Component: OverviewTab, invoice, detail },
            { label: 'Line Items', Component: LineItemsTab, detail },
            { label: 'Payments', Component: PaymentsTab, detail },
          ]}
        />
      </div>

      {/* Footer — change status */}
      <div className='p-4 border-t shrink-0 space-y-2'>
        <div className='flex items-center gap-2'>
          <Select value={statusTarget} onValueChange={setStatusTarget}>
            <SelectTrigger className='h-9 flex-1 text-sm'>
              <SelectValue placeholder='Change status…' />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_STATUSES.filter(s => s !== invoice.status).map(s => (
                <SelectItem key={s} value={s} className='text-xs'>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size='sm' className='h-9 px-4 shadow-sm shadow-primary/20' disabled={!statusTarget || saving} onClick={handleUpdateStatus}>
            {saving ? 'Saving…' : 'Apply'}
          </Button>
        </div>
      </div>
    </div>
  )
}
