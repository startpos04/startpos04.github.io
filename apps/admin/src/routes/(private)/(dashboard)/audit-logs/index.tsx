/**
 * /audit-logs — Platform Audit Log
 *
 * Local-first via fetchAuditLogs hook (auditLogCollection).
 * Clicking a row opens a detail drawer showing before/after JSON.
 */

import { Aside } from '@platform/components/custom/aside'
import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Avatar, AvatarFallback } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { ScrollArea } from '@platform/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Calendar, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminAuditLogRow } from '@/lib/queries/fetch-audit-logs'
import { fetchAuditLogs } from '@/lib/queries/fetch-audit-logs'

export const Route = createFileRoute('/(private)/(dashboard)/audit-logs/' as never)({
  component: AuditLogsPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASIDE_ID = 'audit-log-aside'

const ACTION_COLORS: Record<string, string> = {
  EMPLOYEE_DISABLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  ACCOUNT_DELETED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  EMPLOYEE_ROLE_CHANGED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  SUBSCRIPTION_PLAN_CHANGED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  TRANSACTION_REFUNDED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  PERMISSION_GRANTED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  PERMISSION_REVOKED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
}

// ---------------------------------------------------------------------------
// Detail drawer
// ---------------------------------------------------------------------------

function AuditDetailDrawer({ entry, onClose }: { entry: AdminAuditLogRow; onClose: () => void }) {
  const actorLabel = entry.actorName ?? entry.actorEmail ?? entry.actorId
  const actorInitials =
    actorLabel
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div>
          <h2 className='text-base font-semibold'>{entry.action.replace(/_/g, ' ')}</h2>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {entry.targetType} · {entry.targetId.slice(0, 16)}…
          </p>
        </div>
        <Button variant='ghost' size='icon' onClick={onClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-5'>
          {/* Actor */}
          <div>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>Actor</p>
            <div className='flex items-center gap-3 rounded-lg border bg-muted/30 p-3'>
              <Avatar className='h-9 w-9'>
                <AvatarFallback className='text-xs bg-primary/10 text-primary font-bold'>{actorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className='text-sm font-medium'>{entry.actorName ?? entry.actorEmail ?? 'Unknown'}</p>
                {entry.actorEmail && entry.actorName && <p className='text-xs text-muted-foreground'>{entry.actorEmail}</p>}
                <p className='text-xs font-mono text-muted-foreground'>{entry.actorId}</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className='rounded-lg border bg-muted/30 p-4 space-y-3 text-sm'>
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Business</span>
              <span className='font-medium'>{entry.businessName}</span>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Action</span>
              <Badge variant='outline' className={`text-xs ${ACTION_COLORS[entry.action] ?? ''}`}>
                {entry.action}
              </Badge>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>Target</span>
              <span className='font-mono text-xs'>{entry.targetType}</span>
            </div>
            <Separator />
            <div className='flex justify-between'>
              <span className='text-muted-foreground'>When</span>
              <span className='text-xs'>{entry.createdAt ? dayjs(entry.createdAt).format('MMM D, YYYY h:mm A') : '—'}</span>
            </div>
            {entry.ipAddress && (
              <>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>IP</span>
                  <span className='font-mono text-xs'>{entry.ipAddress}</span>
                </div>
              </>
            )}
          </div>

          {/* Before / After */}
          {entry.before && (
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>Before</p>
              <pre className='text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono'>
                {JSON.stringify(entry.before, null, 2)}
              </pre>
            </div>
          )}
          {entry.after && (
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>After</p>
              <pre className='text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words font-mono'>
                {JSON.stringify(entry.after, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — local-first ───────────────────────────────────────────
  const { data, distinctActions, isLoading } = fetchAuditLogs({
    ...(search ? { searchQuery: search } : {}),
    ...(actionFilter ? { actionFilter } : {}),
  })

  const handleSelectRow = useCallback((row: AdminAuditLogRow) => {
    setSelectedId(row.id)
    MountManager.show(Aside, {
      key: ASIDE_ID,
      target: ASIDE_ID,
      children: (
        <AuditDetailDrawer
          entry={row}
          onClose={() => {
            setSelectedId('')
            MountManager.clear(ASIDE_ID)
          }}
        />
      ),
    })
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminAuditLogRow>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('action', {
              header: 'Action',
              cell: (info: any) => (
                <Badge variant='outline' className={`text-xs ${ACTION_COLORS[info.getValue() as string] ?? ''}`}>
                  {(info.getValue() as string).replace(/_/g, ' ')}
                </Badge>
              ),
            }),

            h.accessor('actorEmail', {
              header: 'Actor',
              cell: (info: any) => {
                const row: AdminAuditLogRow = info.row.original
                const label = row.actorName ?? row.actorEmail ?? row.actorId
                const initials = label
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <div className='flex items-center gap-2'>
                    <Avatar className='h-6 w-6'>
                      <AvatarFallback className='text-[10px] bg-primary/10 text-primary font-bold'>{initials}</AvatarFallback>
                    </Avatar>
                    <span className='text-sm truncate max-w-[140px]'>{label}</span>
                  </div>
                )
              },
            }),

            h.accessor('businessName', {
              header: 'Business',
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('targetType', {
              header: 'Target',
              maxSize: 110,
              cell: (info: any) => <span className='text-xs font-mono text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('createdAt', {
              header: 'When',
              maxSize: 140,
              cell: (info: any) => {
                const v = info.getValue() as Date | null
                return (
                  <div className='flex items-center gap-1.5'>
                    <Calendar className='size-3.5 text-muted-foreground shrink-0' />
                    <span className='text-xs text-muted-foreground'>{v ? dayjs(v).fromNow() : '—'}</span>
                  </div>
                )
              },
            }),
          ] as ColumnDef<AdminAuditLogRow, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_AUDIT_LOGS}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Audit Logs</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Immutable record of all platform actions across all businesses.</p>
                <p className='text-xs text-muted-foreground'>{isLoading ? 'Loading…' : `${data.length.toLocaleString()} entries`}</p>
              </div>
            </div>
          </div>

          {/* Filters — search is wired directly to the hook (no submit button needed) */}
          <div className='flex items-center gap-2 flex-wrap'>
            <Select value={actionFilter || 'all'} onValueChange={v => setActionFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className='h-9 w-52 text-sm'>
                <SelectValue placeholder='Filter by action' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All actions</SelectItem>
                {distinctActions.map(a => (
                  <SelectItem key={a} value={a} className='text-xs font-mono'>
                    {a.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(search || actionFilter) && (
              <Button
                size='sm'
                variant='ghost'
                className='h-9 text-xs'
                onClick={() => {
                  setSearch('')
                  setActionFilter('')
                }}
              >
                <X className='size-3.5 mr-1' /> Clear filters
              </Button>
            )}
          </div>

          {/* Table — in-memory search via hook, no server pagination */}
          <TableView<AdminAuditLogRow>
            data={data}
            isFetching={isLoading}
            columns={columns}
            emptyMessage='No audit log entries found.'
            searchable={{ searchValue: search, onSearchChange: setSearch }}
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: row => row.id === selectedId,
            }}
          />
        </div>

        <MountManager id={ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
