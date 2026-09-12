/**
 * SubscriptionDetailSidebar
 *
 * Full subscription management panel for a single business.
 * Tabs: Overview | Actions
 * Mirrors web EmployeeDetailsSidebar structure exactly.
 */

import Tab from '@platform/components/custom/tab'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import dayjs from '@platform/lib/dayjs'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { PlanOption, SubscriptionRow } from '@/lib/server-fn/subscriptions'
import {
  addCredits,
  changePlan,
  changeStatus,
  extendTrial,
  listPlans,
} from '@/lib/server-fn/subscriptions'
import { closeSubscriptionSidebar } from './subscription-sidebar'

// ---------------------------------------------------------------------------
// Status badge colours
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  GRACE_PERIOD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  SUSPENDED: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/40 dark:text-slate-400',
  LONG_TERM_INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
}

function fmt(cents: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(cents / 100)
}

function dateOrDash(iso: string | null) {
  return iso ? dayjs(iso).format('MMM D, YYYY') : '—'
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ sub }: { sub: SubscriptionRow }) {
  return (
    <div className='space-y-4'>
      <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Status</span>
          <Badge variant='outline' className={`text-xs ${STATUS_COLORS[sub.status] ?? ''}`}>
            {sub.status}
          </Badge>
        </div>
        <Separator />
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Plan</span>
          <span className='font-semibold'>{sub.planName}</span>
        </div>
        <Separator />
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Monthly price</span>
          <span className='font-mono'>{fmt(sub.monthlyPrice)}</span>
        </div>
        <Separator />
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Billing model</span>
          <span className='capitalize text-xs'>{sub.billingModel.replace(/_/g, ' ').toLowerCase()}</span>
        </div>
        <Separator />
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>TX this period</span>
          <span className='font-mono tabular-nums'>{sub.txUsedThisPeriod.toLocaleString()}</span>
        </div>
      </div>

      {/* Dates */}
      <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
        {sub.trialEndsAt && (
          <>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Trial ends</span>
              <span>{dateOrDash(sub.trialEndsAt)} <span className='text-xs text-muted-foreground'>({dayjs(sub.trialEndsAt).fromNow()})</span></span>
            </div>
            <Separator />
          </>
        )}
        {sub.currentPeriodStart && (
          <>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Period start</span>
              <span>{dateOrDash(sub.currentPeriodStart)}</span>
            </div>
            <Separator />
          </>
        )}
        {sub.currentPeriodEnd && (
          <>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Period end</span>
              <span>{dateOrDash(sub.currentPeriodEnd)} <span className='text-xs text-muted-foreground'>({dayjs(sub.currentPeriodEnd).fromNow()})</span></span>
            </div>
            <Separator />
          </>
        )}
        {sub.gracePeriodEndsAt && (
          <>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Grace ends</span>
              <span className='text-amber-600 text-xs font-semibold'>{dateOrDash(sub.gracePeriodEndsAt)}</span>
            </div>
            <Separator />
          </>
        )}
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Advance credits</span>
          <span className='font-mono tabular-nums'>
            {sub.advancePaymentCredits > 0
              ? `${sub.advancePaymentCredits} period${sub.advancePaymentCredits > 1 ? 's' : ''}`
              : '—'}
          </span>
        </div>
        {sub.advancePaymentExpiresAt && (
          <>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Credits expire</span>
              <span className='text-xs'>{dateOrDash(sub.advancePaymentExpiresAt)}</span>
            </div>
          </>
        )}
      </div>

      {sub.externalId && (
        <div className='rounded-lg border bg-muted/30 p-3'>
          <p className='text-xs text-muted-foreground mb-1'>External ID (Stripe)</p>
          <p className='text-xs font-mono break-all'>{sub.externalId}</p>
        </div>
      )}

      {sub.cancelReason && (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-3'>
          <p className='text-xs font-semibold text-destructive mb-1'>Cancel reason</p>
          <p className='text-xs'>{sub.cancelReason}</p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Actions tab
// ---------------------------------------------------------------------------

function ActionsTab({ sub, onChanged }: { sub: SubscriptionRow; onChanged: () => void }) {
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [selectedPlan, setSelectedPlan] = useState(sub.planId)
  const [creditPeriods, setCreditPeriods] = useState('1')
  const [trialDays, setTrialDays] = useState('7')
  const [statusTarget, setStatusTarget] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listPlans().then(p => setPlans(p as PlanOption[])).catch(() => {})
  }, [])

  const run = async (fn: () => Promise<any>, successMsg?: string) => {
    setBusy(true)
    try {
      const r = await fn() as any
      if (!r.success) { toast.error(r.message); return }
      toast.success(r.message ?? successMsg ?? 'Done.')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const STATUSES = ['ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'LONG_TERM_INACTIVE']

  return (
    <div className='space-y-5'>
      {/* Change plan */}
      <div className='rounded-lg border p-4 space-y-3'>
        <p className='text-sm font-semibold'>Change Plan</p>
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger className='h-9 text-sm'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {plans.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {fmt(p.monthlyPrice)}/mo
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size='sm'
          className='w-full'
          disabled={busy || selectedPlan === sub.planId}
          onClick={() => run(() => changePlan({ data: { subscriptionId: sub.id, planId: selectedPlan } }))}
        >
          Apply Plan Change
        </Button>
      </div>

      {/* Change status */}
      <div className='rounded-lg border p-4 space-y-3'>
        <p className='text-sm font-semibold'>Change Status</p>
        <Select value={statusTarget} onValueChange={setStatusTarget}>
          <SelectTrigger className='h-9 text-sm'>
            <SelectValue placeholder='Select new status…' />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.filter(s => s !== sub.status).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusTarget === 'CANCELLED' && (
          <div className='space-y-1.5'>
            <Label className='text-xs'>Reason (optional)</Label>
            <Textarea
              rows={2}
              placeholder='Why is this being cancelled?'
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className='resize-none text-sm'
            />
          </div>
        )}
        <Button
          size='sm'
          variant={statusTarget === 'CANCELLED' || statusTarget === 'SUSPENDED' ? 'destructive' : 'default'}
          className='w-full'
          disabled={busy || !statusTarget}
          onClick={() => run(() =>
            changeStatus({ data: { subscriptionId: sub.id, status: statusTarget, ...(cancelReason ? { reason: cancelReason } : {}) } })
          )}
        >
          Apply Status Change
        </Button>
      </div>

      {/* Add advance credits */}
      <div className='rounded-lg border p-4 space-y-3'>
        <p className='text-sm font-semibold'>Add Advance Credits</p>
        <p className='text-xs text-muted-foreground'>
          Current: <span className='font-semibold'>{sub.advancePaymentCredits}</span> period{sub.advancePaymentCredits !== 1 ? 's' : ''}
        </p>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            min={1}
            max={12}
            value={creditPeriods}
            onChange={e => setCreditPeriods(e.target.value)}
            className='h-9 w-24 text-sm'
          />
          <span className='text-sm text-muted-foreground'>billing period{Number(creditPeriods) !== 1 ? 's' : ''}</span>
        </div>
        <Button
          size='sm'
          className='w-full'
          disabled={busy || Number(creditPeriods) < 1}
          onClick={() => run(() =>
            addCredits({ data: { subscriptionId: sub.id, periods: Number(creditPeriods) } })
          )}
        >
          Add Credits
        </Button>
      </div>

      {/* Extend trial */}
      <div className='rounded-lg border p-4 space-y-3'>
        <p className='text-sm font-semibold'>Extend Trial</p>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            min={1}
            max={90}
            value={trialDays}
            onChange={e => setTrialDays(e.target.value)}
            className='h-9 w-24 text-sm'
          />
          <span className='text-sm text-muted-foreground'>day{Number(trialDays) !== 1 ? 's' : ''}</span>
        </div>
        <Button
          size='sm'
          variant='outline'
          className='w-full'
          disabled={busy || Number(trialDays) < 1}
          onClick={() => run(() =>
            extendTrial({ data: { subscriptionId: sub.id, days: Number(trialDays) } })
          )}
        >
          Extend Trial
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  open?: boolean
  sub: SubscriptionRow
  onClose?: () => void
  onChanged?: () => void
}

export function SubscriptionDetailSidebar({ sub, onClose, onChanged }: Props) {
  const handleClose = onClose ?? closeSubscriptionSidebar
  const handleChanged = onChanged ?? (() => {})

  const initials = sub.businessName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className='flex flex-col h-full'>
      {/* Header — mirrors employee sidebar exactly */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10 border border-border/50 shadow-sm'>
            <AvatarImage src={sub.businessLogo ?? ''} alt={sub.businessName} />
            <AvatarFallback className='bg-primary/5 text-primary text-sm font-bold'>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-semibold leading-tight'>{sub.businessName}</h2>
            </div>
            <div className='flex gap-1.5 mt-1 flex-wrap'>
              <Badge variant='outline' className={`text-[10px] py-0 h-4 ${STATUS_COLORS[sub.status] ?? ''}`}>
                {sub.status}
              </Badge>
              <Badge variant='outline' className='text-[10px] py-0 h-4'>{sub.planName}</Badge>
            </div>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Scrollable content — tabbed */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        <Tab
          defaultValue='Overview'
          tabs={[
            {
              label: 'Overview',
              Component: OverviewTab,
              sub,
            },
            {
              label: 'Actions',
              Component: ActionsTab,
              sub,
              onChanged: handleChanged,
            },
          ]}
        />
      </div>
    </div>
  )
}
