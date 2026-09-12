/**
 * /accounts — Admin User Management
 *
 * Local-first via fetchAdminAccounts hook (adminUserCollection).
 * Clicking a row opens AccountDetailSidebar.
 * "Add Account" opens CreateAccountSidebar.
 *
 * Mirrors web app's /employees page exactly.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { Button } from '@platform/components/ui/button'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { adminUserCols } from '@/lib/columns/admin-user-columns'
import { tableCols } from '@/lib/columns/table-columns'
import type { AdminAccountRow } from '@/lib/queries/fetch-admin-accounts'
import { fetchAdminAccounts } from '@/lib/queries/fetch-admin-accounts'
import type { AdminUserRow } from '@/lib/server-fn/admin-accounts'
import { ACCOUNT_ASIDE_ID, closeAccountSidebar, showAccountSidebar } from './-components/account-sidebar'
import { AccountDetailSidebar } from './$accountId'
import { CreateAccountSidebar } from './create'

export const Route = createFileRoute('/(private)/(dashboard)/accounts/' as never)({
  component: AccountsPage,
})

// ---------------------------------------------------------------------------
// Adapter — AdminAccountRow → AdminUserRow (for existing sidebar/columns)
// ---------------------------------------------------------------------------

function toAdminUserRow(a: AdminAccountRow): AdminUserRow {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    image: a.image,
    emailVerified: a.emailVerified,
    deletedAt: a.deletedAt ? new Date(a.deletedAt) : null,
    createdAt: a.createdAt ?? new Date(),
    updatedAt: new Date(),
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountsPage() {
  const [selectedId, setSelectedId] = useState('')

  // ── Hook call — mirrors fetchPosProducts pattern ──────────────────────
  const { data, isLoading } = fetchAdminAccounts()

  const handleAdd = () => {
    setSelectedId('')
    showAccountSidebar(
      <CreateAccountSidebar
        onCreated={() => {
          /* collection re-syncs automatically */
        }}
        onClose={closeAccountSidebar}
      />,
    )
  }

  const handleSelectRow = useCallback((account: AdminAccountRow) => {
    setSelectedId(account.id)
    showAccountSidebar(
      <AccountDetailSidebar
        open
        account={toAdminUserRow(account)}
        onChanged={() => {
          /* collection re-syncs automatically */
        }}
        onClose={() => {
          setSelectedId('')
          closeAccountSidebar()
        }}
      />,
    )
  }, [])

  const columns = useMemo(
    () =>
      getColumns<AdminAccountRow>(
        (h: any) =>
          [
            tableCols.number(h),
            adminUserCols.avatar(h),
            adminUserCols.name(h),
            adminUserCols.email(h),
            adminUserCols.role(h),
            adminUserCols.status(h),
            // deleteAction omitted here — handled inside AccountDetailSidebar
            // biome-ignore lint/suspicious/noExplicitAny: ColumnDef generic required by library
          ] as import('@tanstack/react-table').ColumnDef<AdminAccountRow, any>[],
      ),
    [],
  )

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_ACCOUNTS}>
      <div className='w-full h-screen bg-background flex overflow-hidden relative min-h-0 flex-1'>
        <div className='flex-1 min-w-0 h-full px-4 flex flex-col overflow-hidden transition-all duration-300 ease-in-out bg-background/50 space-y-2'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-foreground'>Accounts</h1>
              <div className='space-y-1'>
                <p className='text-muted-foreground text-sm'>Manage admin panel users and their roles.</p>
                <p className='text-xs text-muted-foreground'>{isLoading ? 'Loading…' : `${data.length} account${data.length !== 1 ? 's' : ''}`}</p>
              </div>
            </div>
            <Button size='sm' className='shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]' onClick={handleAdd}>
              <Plus className='size-4 mr-1.5' />
              Add Account
            </Button>
          </div>

          <TableView<AdminAccountRow>
            data={data}
            isFetching={isLoading}
            columns={columns}
            searchable={{
              searchValue: '',
              onSearchChange: () => {},
            }}
            selectableRow={{
              onClick: handleSelectRow,
              isSelected: row => row.id === selectedId,
            }}
          />
        </div>

        <MountManager id={ACCOUNT_ASIDE_ID} />
      </div>
    </RequireAdminPermission>
  )
}
