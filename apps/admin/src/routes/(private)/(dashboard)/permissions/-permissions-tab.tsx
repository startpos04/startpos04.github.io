/**
 * Permissions Tab — local-first via fetchAdminPermissionsWithUsers hook
 */

import { getColumns } from '@platform/components/custom/data-view'
import { MultiView } from '@platform/components/custom/data-view/multi-view'
import MountManager from '@platform/lib/mount-manager'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { permissionCols } from '@/lib/columns/permission-columns'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminPermissionWithUsersRow } from '@/lib/queries/fetch-admin-permissions'
import { fetchAdminPermissionsWithUsers } from '@/lib/queries/fetch-admin-permissions'
import { closePermissionSidebar, PERMISSION_ASIDE_ID, showPermissionSidebar } from './-components/permission-sidebar'
import { PermissionUsersSidebar } from './-components/permission-users-sidebar'

// ---------------------------------------------------------------------------
// Column adapter — AdminPermissionWithUsersRow acts as AdminPermissionWithUsers
// The permissionCols were built for AdminPermissionWithUsers from server-fn;
// AdminPermissionWithUsersRow from the hook has the same shape.
// ---------------------------------------------------------------------------

export function PermissionsTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — local-first ───────────────────────────────────────────
  const { data, isLoading } = fetchAdminPermissionsWithUsers({
    ...(search ? { searchQuery: search } : {}),
  })

  const handleSelectRow = useCallback((permission: AdminPermissionWithUsersRow) => {
    setSelectedId(permission.id)
    showPermissionSidebar(
      <PermissionUsersSidebar
        permissionId={permission.id}
        onClose={() => {
          setSelectedId('')
          closePermissionSidebar()
        }}
      />,
    )
  }, [])

  // biome-ignore-all lint/suspicious/noExplicitAny: column helper
  const columns = useMemo(
    () =>
      getColumns<AdminPermissionWithUsersRow>(
        (h: any) =>
          [
            tableCols.number(h),
            permissionCols.name(h),
            permissionCols.description(h),
            permissionCols.scope(h),
            permissionCols.category(h),
            permissionCols.users(h),
          ] as ColumnDef<AdminPermissionWithUsersRow, unknown>[],
      ),
    [],
  )

  return (
    <div className='w-full h-full bg-background flex overflow-hidden relative min-h-0 flex-1'>
      <div className='px-4 flex-1 min-w-0 h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
        <MultiView<AdminPermissionWithUsersRow>
          label='Permissions'
          description='View all admin permissions and manage user assignments.'
          data={data}
          isFetching={isLoading}
          searchable={{
            searchValue: search,
            onSearchChange: v => {
              setSearch(v)
              setPage(1)
            },
          }}
          paginable={{
            pageSize,
            pageIndex: page - 1,
            totalItems: data.length,
            onPaginationChange: next => {
              setPage(next.pageIndex + 1)
              setPageSize(next.pageSize)
            },
          }}
          views={{
            onViewChange: () => {},
            selectedView: 'table',
            list: [
              {
                type: 'table',
                columns,
                selectableRow: {
                  onClick: handleSelectRow,
                  isSelected: (p: AdminPermissionWithUsersRow) => p.id === selectedId,
                },
              },
            ],
          }}
        />
      </div>

      <MountManager id={PERMISSION_ASIDE_ID} />
    </div>
  )
}
