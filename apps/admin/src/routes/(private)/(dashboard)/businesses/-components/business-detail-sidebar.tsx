/**
 * BusinessDetailSidebar
 *
 * Full business info with subscription status, plan, usage, and actions.
 */

import { WarningPrompt } from '@platform/components/custom/prompt/warning-prompt'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Separator } from '@platform/components/ui/separator'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { PauseIcon, PlayIcon, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { BusinessRow } from '@/lib/server-fn/businesses'
import { suspendBusiness, unsuspendBusiness } from '@/lib/server-fn/businesses'
import { closeBusinessSidebar } from './business-sidebar'

interface Props {
  business: BusinessRow
  onClose?: () => void
  onChanged?: () => void
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  GRACE_PERIOD: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  EXPIRED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  SUSPENDED: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700',
  LONG_TERM_INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-500',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-500',
}

export function BusinessDetailSidebar({ business, onClose, onChanged }: Props) {
  const handleClose = onClose ?? closeBusinessSidebar
  const [busy, setBusy] = useState(false)

  const isSuspended = business.subscriptionStatus === 'SUSPENDED'

  const handleSuspend = () => {
    MountManager.show(WarningPrompt, {
      title: 'Suspend Business',
      description: `"${business.name}" will lose access to all operational features immediately.`,
      onConfirm: async () => {
        setBusy(true)
        try {
          const r = (await suspendBusiness({ data: { businessId: business.id } })) as any
          if (!r.success) {
            toast.error(r.message)
            return false
          }
          toast.success(r.message)
          onChanged?.()
          handleClose()
          return true
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const handleUnsuspend = async () => {
    setBusy(true)
    try {
      const r = (await unsuspendBusiness({ data: { businessId: business.id } })) as any
      if (!r.success) {
        toast.error(r.message)
        return
      }
      toast.success(r.message)
      onChanged?.()
      handleClose()
    } finally {
      setBusy(false)
    }
  }

  const initials = business.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10 border border-border/50'>
            <AvatarImage src={business.logo ?? ''} alt={business.name} />
            <AvatarFallback className='bg-primary/10 text-primary font-bold text-sm'>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className='text-base font-semibold leading-tight'>{business.name}</h2>
            <p className='text-xs text-muted-foreground font-mono'>{business.slug}</p>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Body */}
      <div className='flex-1 overflow-y-auto p-4 space-y-5'>
        {/* Subscription status */}
        <div className='rounded-lg border bg-muted/30 p-4 space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-muted-foreground font-medium'>Status</span>
            {business.subscriptionStatus ? (
              <Badge variant='outline' className={`text-xs ${STATUS_COLORS[business.subscriptionStatus] ?? ''}`}>
                {business.subscriptionStatus}
              </Badge>
            ) : (
              <span className='text-xs text-muted-foreground'>No subscription</span>
            )}
          </div>
          {business.planName && (
            <>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-xs text-muted-foreground font-medium'>Plan</span>
                <span className='text-sm font-semibold'>{business.planName}</span>
              </div>
            </>
          )}
          {business.trialEndsAt && business.subscriptionStatus === 'TRIAL' && (
            <>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-xs text-muted-foreground font-medium'>Trial ends</span>
                <span className='text-xs'>{dayjs(business.trialEndsAt).fromNow()}</span>
              </div>
            </>
          )}
          {business.currentPeriodEnd && business.subscriptionStatus !== 'TRIAL' && (
            <>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-xs text-muted-foreground font-medium'>Period ends</span>
                <span className='text-xs'>{dayjs(business.currentPeriodEnd).fromNow()}</span>
              </div>
            </>
          )}
          {business.advancePaymentCredits > 0 && (
            <>
              <Separator />
              <div className='flex items-center justify-between'>
                <span className='text-xs text-muted-foreground font-medium'>Advance credits</span>
                <Badge variant='outline' className='text-xs bg-green-50 text-green-700 border-green-200'>
                  {business.advancePaymentCredits} period{business.advancePaymentCredits > 1 ? 's' : ''} prepaid
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Stats */}
        <div className='grid grid-cols-3 gap-3'>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className='text-xl font-bold'>{business.branchCount}</p>
            <p className='text-xs text-muted-foreground'>Branches</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className='text-xl font-bold'>{business.memberCount}</p>
            <p className='text-xs text-muted-foreground'>Members</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className='text-xl font-bold'>{business.txUsedThisPeriod.toLocaleString()}</p>
            <p className='text-xs text-muted-foreground'>TX used</p>
          </div>
        </div>

        {/* Meta */}
        <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Type</span>
            <span className='font-medium capitalize'>{business.businessType.toLowerCase()}</span>
          </div>
          <Separator />
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Country</span>
            <span className='font-medium'>{business.countryCode}</span>
          </div>
          <Separator />
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Registration</span>
            <span className='font-medium capitalize'>{business.registrationStatus.toLowerCase().replace('_', ' ')}</span>
          </div>
          <Separator />
          <div className='flex justify-between'>
            <span className='text-muted-foreground'>Joined</span>
            <span className='text-xs'>{business.createdAt ? dayjs(business.createdAt).format('MMM D, YYYY') : '—'}</span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Actions</p>
          {isSuspended ? (
            <Button variant='outline' size='sm' className='w-full justify-start gap-2' onClick={handleUnsuspend} disabled={busy}>
              <PlayIcon className='size-4 text-green-600' />
              Reactivate Business
            </Button>
          ) : (
            <Button
              variant='outline'
              size='sm'
              className='w-full justify-start gap-2 text-destructive border-destructive/30 hover:bg-destructive/10'
              onClick={handleSuspend}
              disabled={busy || !business.subscriptionStatus}
            >
              <PauseIcon className='size-4' />
              Suspend Business
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
