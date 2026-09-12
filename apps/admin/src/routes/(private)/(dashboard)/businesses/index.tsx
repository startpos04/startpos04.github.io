/**
 * /businesses — Platform Business Management
 *
 * Local-first via fetchBusinesses hook (same pattern as fetch-pos-products).
 * MultiView: table + grid.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { MultiView } from '@platform/components/custom/data-view/multi-view'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { BuildingIcon, UsersIcon } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminBusiness } from '@/lib/queries/fetch-businesses'
import { fetchBusinesses } from '@/lib/queries/fetch-businesses'
import type { BusinessRow } from '@/lib/server-fn/businesses'
import { BusinessDetailSidebar } from './-components/business-detail-sidebar'
import { BUSINESS_ASIDE_ID, closeBusinessSidebar, showBusinessSidebar } from './-components/business-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/businesses/' as never)({
  component: BusinessesPage,
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
  LONG_TERM_INACTIVE: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900/40',
}

// ---------------------------------------------------------------------------
// Adapter — AdminBusiness → BusinessRow (for existing sidebar)
// ---------------------------------------------------------------------------

function toBusinessRow(b: AdminBusiness): BusinessRow {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: b.logo,
    businessType: b.businessType,
    countryCode: b.countryCode,
    registrationStatus: b.registrationStatus,
    createdAt: b.createdAt?.toISOString() ?? '',
    subscriptionId: null,
    subscriptionStatus: b.subscriptionStatus,
    planName: null,
    trialEndsAt: b.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: b.currentPeriodEnd?.toISOString() ?? null,
    advancePaymentCredits: b.advancePaymentCredits,
    branchCount: b.branchCount,
    memberCount: b.memberCount,
    txUsedThisPeriod: b.txUsedThisPeriod,
  }
}

// ---------------------------------------------------------------------------
// Grid card
// ---------------------------------------------------------------------------

function BusinessCard({ business, onClick }: { business: AdminBusiness; onClick: () => void }) {
  const initials = business.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const status = business.subscriptionStatus

  return (
    <Card
      className='border-border shadow-sm rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md h-full flex flex-col transition-all hover:shadow-md cursor-pointer group'
      onClick={onClick}
    >
      <div className='relative h-20 w-full bg-muted/40 border-b flex items-center justify-center'>
        <Avatar className='h-14 w-14 border-2 border-background shadow-md'>
          <AvatarImage src={business.logo ?? ''} alt={business.name} className='object-cover' />
          <AvatarFallback className='bg-primary/10 text-primary font-bold text-lg'>{initials}</AvatarFallback>
        </Avatar>
        {status && (
          <div className='absolute top-2 right-2'>
            <Badge variant='outline' className={`text-[10px] ${STATUS_COLORS[status] ?? ''}`}>
              {status}
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className='pb-2 pt-3'>
        <CardTitle className='text-base font-bold line-clamp-1'>{business.name}</CardTitle>
        <p className='text-xs text-muted-foreground font-mono'>{business.slug}</p>
      </CardHeader>

      <CardContent className='space-y-3 flex-1 flex flex-col'>
        <div className='grid grid-cols-2 gap-2 mt-auto'>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <BuildingIcon className='size-3.5 shrink-0' />
            <span>
              {business.branchCount} branch{business.branchCount !== 1 ? 'es' : ''}
            </span>
          </div>
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <UsersIcon className='size-3.5 shrink-0' />
            <span>
              {business.memberCount} member{business.memberCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {business.trialEndsAt && status === 'TRIAL' && (
          <p className='text-xs text-muted-foreground'>
            Trial ends <span className='font-medium'>{dayjs(business.trialEndsAt).fromNow()}</span>
          </p>
        )}
        {business.currentPeriodEnd && status !== 'TRIAL' && (
          <p className='text-xs text-muted-foreground'>
            Renews <span className='font-medium'>{dayjs(business.currentPeriodEnd).fromNow()}</span>
          </p>
        )}

        <p className='text-xs text-muted-foreground'>
          <span className='font-medium tabular-nums'>{business.txUsedThisPeriod.toLocaleString()}</span> TX this period
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BusinessesPage() {
  const [selectedId, setSelectedId] = useState('')

  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>
  const view = (rawSearch['view'] as 'table' | 'grid') ?? 'table'
  const search = (rawSearch['search'] as string) ?? ''
  const statusFilter = (rawSearch['status'] as string) ?? ''
  const navigate = useNavigate()

  // ── Hook call — mirrors fetchPosProducts pattern ──────────────────────
  const { data, isLoading } = fetchBusinesses({
    ...(search ? { searchQuery: search } : {}),
    ...(statusFilter ? { statusFilter } : {}),
  })

  const handleSelectRow = useCallback((business: AdminBusiness) => {
    setSelectedId(business.id)
    showBusinessSidebar(
      <BusinessDetailSidebar
        business={toBusinessRow(business)}
        onChanged={() => {
          /* collection re-syncs automatically */
        }}
        onClose={() => {
          setSelectedId('')
          closeBusinessSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminBusiness>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('logo', {
              header: '',
              maxSize: 48,
              cell: (info: any) => {
                const b: AdminBusiness = info.row.original
                const initials = b.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <Avatar className='h-8 w-8 border border-border/50'>
                    <AvatarImage src={b.logo ?? ''} alt={b.name} />
                    <AvatarFallback className='bg-primary/5 text-primary text-xs font-bold'>{initials}</AvatarFallback>
                  </Avatar>
                )
              },
            }),

            h.accessor('name', {
              header: 'Business',
              cell: (info: any) => (
                <div className='flex flex-col'>
                  <span className='font-semibold text-foreground'>{info.getValue()}</span>
                  <span className='text-xs font-mono text-muted-foreground'>{info.row.original.slug}</span>
                </div>
              ),
            }),

            h.accessor('subscriptionStatus', {
              header: 'Status',
              maxSize: 130,
              cell: (info: any) => {
                const s = info.getValue() as string | null
                if (!s) return <span className='text-xs text-muted-foreground'>—</span>
                return (
                  <Badge variant='outline' className={`text-xs ${STATUS_COLORS[s] ?? ''}`}>
                    {s}
                  </Badge>
                )
              },
            }),

            h.accessor('branchCount', {
              header: 'Branches',
              maxSize: 90,
              cell: (info: any) => <span className='text-sm tabular-nums'>{info.getValue()}</span>,
            }),

            h.accessor('memberCount', {
              header: 'Members',
              maxSize: 90,
              cell: (info: any) => <span className='text-sm tabular-nums'>{info.getValue()}</span>,
            }),

            h.accessor('txUsedThisPeriod', {
              header: 'TX (period)',
              maxSize: 100,
              cell: (info: any) => <span className='text-sm tabular-nums text-muted-foreground'>{(info.getValue() as number).toLocaleString()}</span>,
            }),

            h.accessor('createdAt', {
              header: 'Joined',
              maxSize: 120,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return <span className='text-xs text-muted-foreground'>{v ? dayjs(v).format('MMM D, YYYY') : '—'}</span>
              },
            }),
          ] as ColumnDef<AdminBusiness, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_BUSINESSES}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          <MultiView<AdminBusiness>
            label='Businesses'
            description='All registered businesses on the platform.'
            data={data}
            isFetching={isLoading}
            searchable={{
              searchValue: search,
              onSearchChange: s => {
                navigate({ search: ((prev: any) => ({ ...prev, search: s })) as never, replace: true })
              },
            }}
            views={{
              onViewChange: v => {
                navigate({ search: ((prev: any) => ({ ...prev, view: v })) as never, replace: true })
              },
              selectedView: view,
              list: [
                {
                  type: 'table',
                  columns,
                  selectableRow: {
                    onClick: handleSelectRow,
                    isSelected: (b: AdminBusiness) => b.id === selectedId,
                  },
                },
                {
                  type: 'grid',
                  renderCard: row => <BusinessCard business={row.original} onClick={() => handleSelectRow(row.original)} />,
                },
              ],
            }}
          />
        </div>

        <MountManager id={BUSINESS_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
