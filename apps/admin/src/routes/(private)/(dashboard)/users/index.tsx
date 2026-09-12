/**
 * /users — Tenant User Management
 *
 * Local-first via fetchUsers hook (same pattern as fetch-pos-products).
 * Detail sidebar still uses server-fn for rich cross-table data.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import MountManager from '@platform/lib/mount-manager'
import { cn } from '@platform/lib/utils'
import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminUser } from '@/lib/queries/fetch-users'
import { fetchUsers } from '@/lib/queries/fetch-users'
import type { TenantUserRow } from '@/lib/server-fn/tenant-users'
import { UserDetailSidebar } from './-components/user-detail-sidebar'
import { closeUserSidebar, showUserSidebar, USER_ASIDE_ID } from './-components/user-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/users/' as never)({
  component: UsersPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = ['OWNER', 'ADMIN', 'SUPERVISOR', 'CASHIER', 'SERVICE_PROVIDER']

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  SUPERVISOR: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  CASHIER: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  SERVICE_PROVIDER: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400',
}

// ---------------------------------------------------------------------------
// Adapter — AdminUser → TenantUserRow (for existing sidebar)
// ---------------------------------------------------------------------------

function toTenantUserRow(u: AdminUser): TenantUserRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    image: u.image,
    emailVerified: u.emailVerified,
    contactNumber: u.contactNumber,
    deletedAt: u.deletedAt?.toISOString() ?? null,
    createdAt: u.createdAt?.toISOString() ?? '',
    businessId: u.businessId,
    businessName: u.businessName,
    branchName: null,
    salesCount: 0,
    servicesCount: 0,
    hasActiveSession: u.hasActiveSession,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — mirrors fetchPosProducts pattern ──────────────────────
  const { data, isLoading } = fetchUsers({
    ...(search ? { searchQuery: search } : {}),
    ...(roleFilter ? { roleFilter } : {}),
  })

  const handleSelectRow = useCallback((user: AdminUser) => {
    setSelectedId(user.id)
    showUserSidebar(
      <UserDetailSidebar
        open
        user={toTenantUserRow(user)}
        onClose={() => {
          setSelectedId('')
          closeUserSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminUser>(
        (h: any) =>
          [
            tableCols.number(h),

            h.accessor('image', {
              header: 'Avatar',
              maxSize: 48,
              cell: (info: any) => {
                const u: AdminUser = info.row.original
                const initials = u.name
                  .split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
                return (
                  <Avatar className='h-9 w-9 border border-border/50 shadow-sm'>
                    <AvatarImage src={u.image ?? ''} alt={u.name} />
                    <AvatarFallback className='bg-primary/5 text-primary text-xs font-bold'>{initials}</AvatarFallback>
                  </Avatar>
                )
              },
            }),

            h.accessor('name', {
              header: 'Name',
              cell: (info: any) => {
                const u: AdminUser = info.row.original
                return (
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-foreground'>{info.getValue()}</span>
                    <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', u.hasActiveSession ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                  </div>
                )
              },
            }),

            h.accessor('email', {
              header: 'Email',
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue()}</span>,
            }),

            h.accessor('role', {
              header: 'Role',
              maxSize: 130,
              cell: (info: any) => {
                const r = info.getValue() as string
                return (
                  <Badge variant='outline' className={`text-xs ${ROLE_COLORS[r] ?? ''}`}>
                    {r}
                  </Badge>
                )
              },
            }),

            h.accessor('businessName', {
              header: 'Business',
              cell: (info: any) => <span className='text-sm text-muted-foreground'>{info.getValue() ?? '—'}</span>,
            }),
          ] as ColumnDef<AdminUser, unknown>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_USERS}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          {/* Header */}
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Users</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>All tenant users across every business.</p>
                <p className='text-xs text-muted-foreground'>
                  {isLoading ? 'Loading…' : `${data.length.toLocaleString()} user${data.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <Select value={roleFilter || 'all'} onValueChange={v => setRoleFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className='h-9 w-44 text-sm'>
                <SelectValue placeholder='All roles' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All roles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r} className='text-xs'>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table — in-memory search/filter via hook, no server pagination */}
          <TableView
            data={data}
            isFetching={isLoading}
            columns={columns}
            searchable={{ searchValue: search, onSearchChange: setSearch }}
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: row => row.id === selectedId,
            }}
          />
        </div>

        <MountManager id={USER_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
