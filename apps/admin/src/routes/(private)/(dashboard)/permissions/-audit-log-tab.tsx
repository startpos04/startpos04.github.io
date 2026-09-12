/**
 * Audit Log Tab — local-first via fetchAdminUsersWithPermissions hook
 */

import { getColumns } from '@platform/components/custom/data-view'
import { MultiView } from '@platform/components/custom/data-view/multi-view'
import MountManager from '@platform/lib/mount-manager'
import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { auditCols } from '@/lib/columns/audit-columns'
import { tableCols } from '@/lib/columns/table-columns'
import { fetchAdminUsersWithPermissions } from '@/lib/queries/fetch-admin-permissions'
import type { AdminAuditEntry } from './-audit'
import { AuditDetailsSidebar } from './audit/-components/audit-details-sidebar'
import { AUDIT_ASIDE_ID, closeAuditSidebar, showAuditSidebar } from './audit/-components/audit-sidebar'

export function AuditLogTab() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — local-first ───────────────────────────────────────────
  const { data, isLoading } = fetchAdminUsersWithPermissions()

  const auditEntries = useMemo<AdminAuditEntry[]>(() => {
    if (!data) return []

    const entries: AdminAuditEntry[] = data.flatMap(user => {
      const grants: AdminAuditEntry[] = user.customGrants.map(g => ({
        id: `grant-${g.id}`,
        type: 'grant' as const,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        permission: { id: g.permissionId, ...g.permission },
        actionBy: g.grantedBy,
        actionAt: g.grantedAt,
        reason: g.note,
      }))

      const revokes: AdminAuditEntry[] = user.customRevokes.map(r => ({
        id: `revoke-${r.id}`,
        type: 'revoke' as const,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        permission: { id: r.permissionId, ...r.permission },
        actionBy: r.grantedBy,
        actionAt: r.grantedAt,
        reason: r.note,
      }))

      return [...grants, ...revokes]
    })

    return entries.sort((a, b) => {
      if (!a.actionAt) return 1
      if (!b.actionAt) return -1
      return new Date(b.actionAt).getTime() - new Date(a.actionAt).getTime()
    })
  }, [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return auditEntries
    const q = search.toLowerCase()
    return auditEntries.filter(
      e =>
        e.user.name?.toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        e.permission.name.toLowerCase().includes(q) ||
        e.permission.key.toLowerCase().includes(q) ||
        e.reason?.toLowerCase().includes(q),
    )
  }, [auditEntries, search])

  const handleSelectRow = useCallback((entry: AdminAuditEntry) => {
    setSelectedId(entry.id)
    showAuditSidebar(
      <AuditDetailsSidebar
        entry={entry}
        onClose={() => {
          setSelectedId('')
          closeAuditSidebar()
        }}
      />,
    )
  }, [])

  const columns = useMemo(
    () =>
      getColumns<AdminAuditEntry>(
        h =>
          [tableCols.number(h), auditCols.action(h), auditCols.permission(h), auditCols.user(h), auditCols.timestamp(h), auditCols.reason(h)] as ColumnDef<
            AdminAuditEntry,
            unknown
          >[],
      ),
    [],
  )

  return (
    <div className='w-full h-full bg-background flex overflow-hidden relative min-h-0 flex-1 gap-4'>
      <div className='flex-1 min-w-0 h-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
        <MultiView<AdminAuditEntry>
          label='Permission Audit Log'
          description='Complete history of admin permission grants and revokes.'
          data={filtered}
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
            totalItems: filtered.length,
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
                  isSelected: (e: AdminAuditEntry) => e.id === selectedId,
                },
              },
            ],
          }}
        />
      </div>

      <MountManager id={AUDIT_ASIDE_ID} />
    </div>
  )
}
