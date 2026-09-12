/**
 * /notifications — Platform Notification Management
 *
 * Two tabs:
 *   In-App        — browse all tenant notifications, archive, send manual
 *   Payment Queue — browse PaymentNotification scheduling queue, retry failed
 */

import { Aside } from '@platform/components/custom/aside'
import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import Tab from '@platform/components/custom/tab'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { BellIcon, RefreshCwIcon, SendIcon, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminNotification } from '@/lib/queries/fetch-notifications'
import { fetchNotifications } from '@/lib/queries/fetch-notifications'
import type { PaymentNotificationRow } from '@/lib/server-fn/notifications'
import { archiveNotification, getBusinessUsers, listPaymentNotifications, retryPaymentNotification, sendNotification } from '@/lib/server-fn/notifications'

export const Route = createFileRoute('/(private)/(dashboard)/notifications/' as never)({
  component: NotificationsPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25
const SEND_ASIDE_ID = 'send-notification-aside'

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  URGENT: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
}

const PNOTIF_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
  SENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
  SENT: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400',
  FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400',
  CANCELLED: 'bg-slate-50 text-slate-500 border-slate-200',
  SKIPPED: 'bg-slate-50 text-slate-500 border-slate-200',
}

const NOTIFICATION_TYPES = [
  'LOW_STOCK',
  'NEW_ORDER',
  'SYSTEM_ALERT',
  'TASK_ASSIGNED',
  'TASK_OVERDUE',
  'COMPLIANCE_REMINDER',
  'PURCHASE_PENDING_APPROVAL',
  'CREDIT_LOW_BALANCE',
  'GROWTH_MILESTONE',
  'USAGE_THRESHOLD',
]

// ---------------------------------------------------------------------------
// Send Notification Drawer
// ---------------------------------------------------------------------------

function fmt(cents: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(cents / 100)
}

function SendNotificationDrawer({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [businessId, setBusinessId] = useState('')
  const [userId, setUserId] = useState('')
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState('SYSTEM_ALERT')
  const [priority, setPriority] = useState('MEDIUM')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!businessId.trim()) {
      setUsers([])
      setUserId('')
      return
    }
    ;(getBusinessUsers as any)({ data: { businessId } })
      .then((u: any[]) => {
        setUsers(u)
        setUserId('')
      })
      .catch(() => setUsers([]))
  }, [businessId])

  const handleSend = async () => {
    if (!businessId || !userId || !title || !message) return
    setBusy(true)
    try {
      const r = (await sendNotification({
        data: { businessId, userId, title, message, type, priority, ...(link ? { link } : {}) },
      })) as any
      if (!r.success) {
        toast.error(r.message)
        return
      }
      toast.success('Notification sent.')
      onSent()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div>
          <h2 className='text-base font-semibold'>Send Notification</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>Send a manual in-app notification to a specific user.</p>
        </div>
        <Button variant='ghost' size='icon' onClick={onClose} className='h-7 w-7'>
          <X className='size-4' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        <div className='space-y-1.5'>
          <Label className='text-xs'>Business ID</Label>
          <Input placeholder='Paste businessId…' value={businessId} onChange={e => setBusinessId(e.target.value)} className='h-9 text-sm font-mono' />
        </div>

        {users.length > 0 && (
          <div className='space-y-1.5'>
            <Label className='text-xs'>User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className='h-9 text-sm'>
                <SelectValue placeholder='Select user…' />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        <div className='space-y-1.5'>
          <Label className='text-xs'>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder='Notification title' className='h-9 text-sm' />
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>Message</Label>
          <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder='Notification body…' className='text-sm resize-none' />
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <Label className='text-xs'>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className='h-9 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map(t => (
                  <SelectItem key={t} value={t} className='text-xs'>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs'>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className='h-9 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
                  <SelectItem key={p} value={p} className='text-xs'>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs'>Link (optional)</Label>
          <Input value={link} onChange={e => setLink(e.target.value)} placeholder='/billing or /orders/123' className='h-9 text-sm' />
        </div>
      </div>

      <div className='p-4 border-t shrink-0'>
        <Button className='w-full gap-2 shadow-sm shadow-primary/20' disabled={busy || !businessId || !userId || !title || !message} onClick={handleSend}>
          <SendIcon className='size-4' />
          {busy ? 'Sending…' : 'Send Notification'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// In-App Notifications tab — local-first via fetchNotifications hook
// ---------------------------------------------------------------------------

function InAppTab() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — mirrors fetchPosProducts pattern ──────────────────────
  const { data, isLoading } = fetchNotifications({
    ...(search ? { searchQuery: search } : {}),
    ...(typeFilter ? { typeFilter } : {}),
  })

  const openSendDrawer = () => {
    MountManager.show(Aside, {
      key: SEND_ASIDE_ID,
      target: SEND_ASIDE_ID,
      children: (
        <SendNotificationDrawer
          onClose={() => MountManager.clear(SEND_ASIDE_ID)}
          onSent={() => {
            /* collection auto-refreshes */
          }}
        />
      ),
    })
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveNotification({ data: { id } })
      toast.success('Archived.')
    } catch {
      toast.error('Failed to archive.')
    }
  }

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminNotification>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('type', {
              header: 'Type',
              maxSize: 160,
              cell: (info: any) => <span className='text-xs font-mono text-muted-foreground'>{(info.getValue() as string).replace(/_/g, ' ')}</span>,
            }),

            h.accessor('title', {
              header: 'Title',
              cell: (info: any) => (
                <div className='flex flex-col'>
                  <span className='font-medium text-sm'>{info.getValue()}</span>
                  <span className='text-xs text-muted-foreground line-clamp-1'>{info.row.original.message}</span>
                </div>
              ),
            }),

            h.accessor('businessName', {
              header: 'Business',
              maxSize: 140,
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('userEmail', {
              header: 'User',
              maxSize: 160,
              cell: (info: any) => {
                const row: AdminNotification = info.row.original
                return (
                  <div className='flex flex-col'>
                    <span className='text-xs font-medium'>{row.userName ?? info.getValue()}</span>
                    {row.userName && <span className='text-xs text-muted-foreground'>{info.getValue()}</span>}
                  </div>
                )
              },
            }),

            h.accessor('priority', {
              header: 'Priority',
              maxSize: 90,
              cell: (info: any) => (
                <Badge variant='outline' className={`text-xs ${PRIORITY_COLORS[info.getValue() as string] ?? ''}`}>
                  {info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('isRead', {
              header: 'Read',
              maxSize: 70,
              cell: (info: any) => (
                <span className={`text-xs ${info.getValue() ? 'text-muted-foreground' : 'text-primary font-semibold'}`}>
                  {info.getValue() ? 'Read' : 'Unread'}
                </span>
              ),
            }),

            h.accessor('createdAt', {
              header: 'When',
              maxSize: 120,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return <span className='text-xs text-muted-foreground'>{v ? dayjs(v).fromNow() : '—'}</span>
              },
            }),

            h.display({
              id: 'actions',
              maxSize: 80,
              header: () => <div className='text-right pr-2'>Actions</div>,
              cell: ({ row }: any) => (
                <div className='flex justify-end pr-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-7 text-xs text-muted-foreground hover:text-destructive'
                    onClick={(e: any) => {
                      e.stopPropagation()
                      handleArchive(row.original.id)
                    }}
                  >
                    Archive
                  </Button>
                </div>
              ),
            }),
          ] as ColumnDef<AdminNotification, unknown>[],
      ),
    [],
  )

  return (
    <div className='space-y-3 h-full flex flex-col px-4'>
      <div className='flex items-center gap-2 flex-wrap shrink-0'>
        <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className='h-9 w-52 text-sm'>
            <SelectValue placeholder='All types' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All types</SelectItem>
            {NOTIFICATION_TYPES.map(t => (
              <SelectItem key={t} value={t} className='text-xs'>
                {t.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size='sm' className='h-9 gap-2 ml-auto' onClick={openSendDrawer}>
          <BellIcon className='size-4' />
          Send Notification
        </Button>
      </div>

      <TableView<AdminNotification>
        data={data}
        isFetching={isLoading}
        columns={columns}
        emptyMessage='No notifications found.'
        searchable={{ searchValue: search, onSearchChange: setSearch }}
        selectableRow={{ onClick: r => setSelectedId(r.id), isSelected: r => r.id === selectedId }}
      />
      <MountManager id={SEND_ASIDE_ID} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payment Notifications tab
// ---------------------------------------------------------------------------

function PaymentQueueTab() {
  const [rows, setRows] = useState<PaymentNotificationRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback((p: number, s: string, st: string) => {
    setLoading(true)
    ;(listPaymentNotifications as any)({
      data: { page: p, pageSize: PAGE_SIZE, ...(s ? { search: s } : {}), ...(st ? { status: st } : {}) },
    })
      .then((r: any) => {
        setRows(r.rows)
        setTotal(r.total)
      })
      .catch(() => {
        setRows([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page, search, statusFilter)
  }, [load, page, search, statusFilter])

  const handleRetry = async (id: string) => {
    try {
      const r = (await retryPaymentNotification({ data: { id } })) as any
      toast.success(r.message)
      load(page, search, statusFilter)
    } catch {
      toast.error('Failed to reschedule.')
    }
  }

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<PaymentNotificationRow>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('notificationType', {
              header: 'Type',
              maxSize: 200,
              cell: (info: any) => <span className='text-xs font-mono text-muted-foreground'>{(info.getValue() as string).replace(/_/g, ' ')}</span>,
            }),

            h.accessor('title', {
              header: 'Title',
              cell: (info: any) => <span className='text-sm font-medium'>{info.getValue()}</span>,
            }),

            h.accessor('businessName', {
              header: 'Business',
              maxSize: 140,
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('amount', {
              header: 'Amount',
              maxSize: 100,
              cell: (info: any) => <span className='text-sm font-mono tabular-nums'>{fmt(info.getValue() as number)}</span>,
            }),

            h.accessor('status', {
              header: 'Status',
              maxSize: 100,
              cell: (info: any) => (
                <Badge variant='outline' className={`text-xs ${PNOTIF_STATUS_COLORS[info.getValue() as string] ?? ''}`}>
                  {info.getValue()}
                </Badge>
              ),
            }),

            h.accessor('scheduledFor', {
              header: 'Scheduled',
              maxSize: 130,
              cell: (info: any) => (
                <div className='flex flex-col'>
                  <span className='text-xs'>{dayjs(info.getValue() as string).format('MMM D, YYYY')}</span>
                  <span className='text-[10px] text-muted-foreground'>{dayjs(info.getValue() as string).fromNow()}</span>
                </div>
              ),
            }),

            h.accessor('sentAt', {
              header: 'Sent',
              maxSize: 110,
              cell: (info: any) => {
                const v = info.getValue() as string | null
                return v ? <span className='text-xs text-green-600'>{dayjs(v).fromNow()}</span> : <span className='text-xs text-muted-foreground'>—</span>
              },
            }),

            h.display({
              id: 'retry',
              maxSize: 90,
              header: () => <div className='text-right pr-2'>Retry</div>,
              cell: ({ row }: any) => {
                if (row.original.status !== 'FAILED') return null
                return (
                  <div className='flex justify-end pr-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 text-xs gap-1'
                      onClick={(e: any) => {
                        e.stopPropagation()
                        handleRetry(row.original.id)
                      }}
                    >
                      <RefreshCwIcon className='size-3' />
                      Retry
                    </Button>
                  </div>
                )
              },
            }),
          ] as ColumnDef<PaymentNotificationRow, unknown>[],
      ),
    [page, search, statusFilter],
  )

  return (
    <div className='space-y-3 h-full flex flex-col px-4'>
      <div className='flex items-center gap-2 shrink-0'>
        <Select
          value={statusFilter || 'all'}
          onValueChange={v => {
            setStatusFilter(v === 'all' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className='h-9 w-40 text-sm'>
            <SelectValue placeholder='All statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            {['SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED'].map(s => (
              <SelectItem key={s} value={s} className='text-xs'>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TableView<PaymentNotificationRow>
        data={rows}
        isFetching={loading}
        columns={columns}
        emptyMessage='No payment notifications found.'
        searchable={{
          searchValue: search,
          onSearchChange: s => {
            setSearch(s)
            setPage(1)
          },
        }}
        paginable={{
          pageIndex: page - 1,
          pageSize: PAGE_SIZE,
          totalItems: total,
          onPaginationChange: next => setPage(next.pageIndex + 1),
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_NOTIFICATIONS}>
      <div className='w-full h-screen bg-background overflow-hidden min-h-0 flex-1'>
        <div className='h-full flex flex-col overflow-hidden bg-background/50 space-y-2'>
          <div className='px-4'>
            <h1 className='text-3xl font-bold tracking-tight text-foreground'>Notifications</h1>
            <p className='text-muted-foreground text-sm mt-1'>Browse in-app notifications and payment notification queue.</p>
          </div>

          <div className='flex-1 min-h-0 overflow-y-auto grow'>
            <Tab
              defaultValue='In-App'
              tabs={[
                { label: 'In-App', Component: InAppTab },
                { label: 'Payment Queue', Component: PaymentQueueTab },
              ]}
              className='grow h-full'
              tabClass='px-4'
            />
          </div>
        </div>
      </div>
    </RequireAdminPermission>
  )
}
