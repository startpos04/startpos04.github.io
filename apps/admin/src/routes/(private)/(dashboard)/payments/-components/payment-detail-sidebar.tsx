/**
 * PaymentDetailSidebar
 *
 * Shows full manual payment details with proof image.
 * Actions: Approve (green) and Reject (destructive with reason textarea).
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import dayjs from '@platform/lib/dayjs'
import { CheckCircle2Icon, Loader2Icon, XCircleIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { ManualPaymentRow } from '@/lib/server-fn/manual-payments'
import { approveManualPayment, rejectManualPayment } from '@/lib/server-fn/manual-payments'
import { closePaymentSidebar } from './payment-sidebar'

// ---------------------------------------------------------------------------
// Helpers
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

const SUB_STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  GRACE_PERIOD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  payment: ManualPaymentRow
  onClose?: () => void
  onReviewed?: () => void
}

export function PaymentDetailSidebar({ payment, onClose, onReviewed }: Props) {
  const handleClose = onClose ?? closePaymentSidebar
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const handleApprove = async () => {
    setBusy(true)
    try {
      const result = await approveManualPayment({ data: { paymentId: payment.id } })
      if (!result.success) { toast.error(result.message); return }
      toast.success(result.message)
      onReviewed?.()
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    setBusy(true)
    try {
      const result = await rejectManualPayment({ data: { paymentId: payment.id, ...(reason.trim() ? { reason: reason.trim() } : {}) } })
      if (!result.success) { toast.error(result.message); return }
      toast.success(result.message)
      onReviewed?.()
      handleClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.')
    } finally {
      setBusy(false)
    }
  }

  const periods = payment.periodsAdvancePaid
  const periodLabel = `${periods} billing period${periods > 1 ? 's' : ''}`

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div>
          <h2 className='text-base font-semibold leading-tight'>{payment.businessName}</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Submitted {dayjs(payment.createdAt).fromNow()} · {dayjs(payment.createdAt).format('MMM D, YYYY h:mm A')}
          </p>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <XIcon className='size-4' />
        </Button>
      </div>

      {/* Body */}
      <div className='flex-1 overflow-y-auto p-4 space-y-5'>
        {/* Key facts */}
        <div className='rounded-lg border bg-muted/30 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground font-medium'>Amount</span>
            <span className='text-lg font-bold'>{formatAmount(payment.amount, payment.currency)}</span>
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground font-medium'>Coverage</span>
            <span className='text-sm font-medium'>{periodLabel}</span>
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground font-medium'>Method</span>
            <Badge variant='outline' className='text-xs'>
              {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
            </Badge>
          </div>
          {payment.subscriptionStatus && (
            <>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-xs text-muted-foreground font-medium'>Subscription</span>
                <Badge
                  variant='outline'
                  className={`text-xs ${SUB_STATUS_COLORS[payment.subscriptionStatus] ?? ''}`}
                >
                  {payment.subscriptionStatus}
                </Badge>
              </div>
            </>
          )}
          {payment.providerReference && (
            <>
              <Separator />
              <div className='flex items-center justify-between gap-3'>
                <span className='text-xs text-muted-foreground font-medium shrink-0'>Reference No.</span>
                <span className='text-sm font-mono text-right truncate'>{payment.providerReference}</span>
              </div>
            </>
          )}
        </div>

        {/* Proof image */}
        {payment.proofImageUrl ? (
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Payment Proof</p>
            <div className='rounded-lg border overflow-hidden bg-muted/20'>
              <img
                src={payment.proofImageUrl}
                alt='Payment proof'
                className='w-full object-contain max-h-80'
              />
            </div>
          </div>
        ) : (
          <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
            No proof image attached.
          </div>
        )}

        {/* Customer notes */}
        {payment.notes && (
          <div className='space-y-1.5'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Customer Notes</p>
            <p className='text-sm bg-muted/30 rounded-lg p-3'>{payment.notes}</p>
          </div>
        )}

        {/* Rejection reason input */}
        {rejecting && (
          <div className='space-y-1.5'>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Rejection Reason</p>
            <Textarea
              placeholder='Tell the customer why the payment was rejected…'
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className='resize-none text-sm'
            />
          </div>
        )}
      </div>

      {/* Footer — actions */}
      <div className='p-4 border-t shrink-0 space-y-2'>
        {!rejecting ? (
          <>
            <Button
              className='w-full gap-2 shadow-sm shadow-green-500/20'
              onClick={handleApprove}
              disabled={busy}
            >
              {busy
                ? <Loader2Icon className='size-4 animate-spin' />
                : <CheckCircle2Icon className='size-4' />}
              Approve Payment
            </Button>
            <Button
              variant='outline'
              className='w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10'
              onClick={() => setRejecting(true)}
              disabled={busy}
            >
              <XCircleIcon className='size-4' />
              Reject Payment
            </Button>
          </>
        ) : (
          <>
            <Button
              variant='destructive'
              className='w-full gap-2'
              onClick={handleReject}
              disabled={busy}
            >
              {busy
                ? <Loader2Icon className='size-4 animate-spin' />
                : <XCircleIcon className='size-4' />}
              Confirm Rejection
            </Button>
            <Button
              variant='ghost'
              className='w-full'
              onClick={() => { setRejecting(false); setReason('') }}
              disabled={busy}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
