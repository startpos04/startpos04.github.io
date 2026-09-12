/**
 * /subscriptions — Platform Subscription Management
 *
 * Local-first via fetchSubscriptions hook (same pattern as fetch-pos-products).
 * planName/monthlyPrice not in collections — sidebar still uses server-fn for those.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
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
import type { AdminSubscription } from '@/lib/queries/fetch-subscriptions'
import { fetchSubscriptions } from '@/lib/queries/fetch-subscriptions'
import type { SubscriptionRow } from '@/lib/server-fn/subscriptions'
import { SubscriptionDetailSidebar } from './-components/subscription-detail-sidebar'
import { closeSubscriptionSidebar, SUBSCRIPTION_ASIDE_ID, showSubscriptionSidebar } from './-components/subscription-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/subscriptions/' as never)({
  component: SubscriptionsPage,
})

// ---------------------------------------------------------------------------
// Constants
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

const ALL_STATUSES = ['TRIAL', 'ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'SUSPENDED', 'LONG_TERM_INACTIVE', 'CANCELLED']

// ---------------------------------------------------------------------------
// Adapter — AdminSubscription → SubscriptionRow (for existing sidebar)
// ---------------------------------------------------------------------------

function toSubscriptionRow(s: AdminSubscription): SubscriptionRow {
  return {
    id: s.id,
    businessId: s.businessId,
    businessName: s.businessName,
    businessLogo: s.businessLogo,
    status: s.status,
    planId: s.planId,
    planName: s.planName ?? null,
    billingModel: s.billingModel,
    monthlyPrice: 0,
    trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
    gracePeriodEndsAt: s.gracePeriodEndsAt?.toISOString() ?? null,
    txUsedThisPeriod: s.txUsedThisPeriod,
    advancePaymentCredits: s.advancePaymentCredits,
    advancePaymentExpiresAt: s.advancePaymentExpiresAt?.toISOString() ?? null,
    externalId: s.externalId,
    cancelReason: s.cancelReason,
    createdAt: s.createdAt?.toISOString() ?? '',
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — mirrors fetchPosProducts pattern ──────────────────────
  const { data, isLoading } = fetchSubscriptions({
    ...(search ? { searchQuery: search } : {}),
    ...(statusFilter ? { statusFilter } : {}),
  })

  const handleSelectRow = useCallback((sub: AdminSubscription) => {
    setSelectedId(sub.id)
    showSubscriptionSidebar(
      <SubscriptionDetailSidebar
        open
        sub={toSubscriptionRow(sub)}
        onChanged={() => {
          /* collection re-syncs automatically */
        }}
        onClose={() => {
          setSelectedId('')
          closeSubscriptionSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminSubscription>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('businessName', {
              header: 'Business',
              cell: (info: any) => {
                const row: AdminSubscription = info.row.original
                const initials = row.businessName
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <div className='flex items-center gap-3'>
                    <Avatar className='h-8 w-8 border border-border/50 shadow-sm'>
                      <AvatarImage src={row.businessLogo ?? ''} alt={row.businessName} />
                      <AvatarFallback className='bg-primary/5 text-primary text-xs font-bold'>{initials}</AvatarFallback>
                    </Avatar>
                    <span className='font-medium text-foreground'>{info.getValue()}</span>
                  </div>
                )
              },
            }),

            h.accessor('status', {
              header: 'Status',
              maxSize: 140,
              cell: (info: any) => (
                <Badge variant='outline' className={`text-xs ${STATUS_COLORS[info.getValue() as string] ?? ''}`}>
                  {info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('txUsedThisPeriod', {
              header: 'TX used',
              maxSize: 90,
              cell: (info: any) => <span className='text-sm tabular-nums text-muted-foreground'>{(info.getValue() as number).toLocaleString()}</span>,
            }),

            h.accessor('advancePaymentCredits', {
              header: 'Credits',
              maxSize: 80,
              cell: (info: any) => {
                const v = info.getValue() as number
                return v > 0 ? (
                  <Badge variant='outline' className='text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400'>
                    {v}p
                  </Badge>
                ) : (
                  <span className='text-xs text-muted-foreground'>—</span>
                )
              },
            }),

            h.accessor('currentPeriodEnd', {
              header: 'Renews',
              maxSize: 130,
              cell: (info: any) => {
                const row: AdminSubscription = info.row.original
                const date = row.status === 'TRIAL' ? row.trialEndsAt : (info.getValue() as Date | null)
                if (!date) return <span className='text-xs text-muted-foreground'>—</span>
                return (
                  <div className='flex flex-col'>
                    <span className='text-xs'>{dayjs(date).format('MMM D, YYYY')}</span>
                    <span className='text-[10px] text-muted-foreground'>{dayjs(date).fromNow()}</span>
                  </div>
                )
              },
            }),

            h.accessor('billingModel', {
              header: 'Model',
              maxSize: 150,
              cell: (info: any) => (
                <span className='text-xs text-muted-foreground capitalize'>{(info.getValue() as string).replace(/_/g, ' ').toLowerCase()}</span>
              ),
            }),
          ] as ColumnDef<AdminSubscription, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_SUBSCRIPTIONS}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Subscriptions</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Manage billing plans, credits, and trial periods.</p>
                <p className='text-xs text-muted-foreground'>
                  {isLoading ? 'Loading…' : `${data.length.toLocaleString()} subscription${data.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className='h-9 w-48 text-sm'>
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

          <TableView<AdminSubscription>
            data={data}
            isFetching={isLoading}
            columns={columns}
            emptyMessage='No subscriptions found.'
            searchable={{ searchValue: search, onSearchChange: setSearch }}
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: row => row.id === selectedId,
            }}
          />
        </div>

        <MountManager id={SUBSCRIPTION_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
