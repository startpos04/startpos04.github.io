/**
 * /permissions — Admin Permission Management
 *
 * Two tabs: Permissions (table + sidebar) and Audit Log (table + sidebar).
 * Access-gated: requires ADMIN_VIEW_PERMISSIONS permission.
 *
 * 1-to-1 mirror of web app's /business/permissions/index.tsx structure.
 */

import Tab from '@platform/components/custom/tab'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { AuditLogTab } from './-audit-log-tab'
import { PermissionsTab } from './-permissions-tab'

const searchSchema = z.object({
  tab: z.string().optional(),
  view: z.enum(['table', 'grid']).optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
})

export const Route = createFileRoute('/(private)/(dashboard)/permissions/' as never)({
  validateSearch: searchSchema,
  component: PermissionsPage,
})

const TABS = [
  { label: 'Permissions', Component: PermissionsTab },
  { label: 'Audit Log', Component: AuditLogTab },
] as const

type TabLabel = (typeof TABS)[number]['label']
const VALID_TABS = new Set<TabLabel>(TABS.map(t => t.label))
function isValidTab(v: string): v is TabLabel {
  return VALID_TABS.has(v as TabLabel)
}

function PermissionsPage() {
  const rawTab = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('tab') ?? '') : ''
  const defaultValue: TabLabel = isValidTab(rawTab) ? rawTab : 'Permissions'

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_PERMISSIONS}>
      <div className='grow flex flex-col gap-2 h-full'>
        <Tab defaultValue={defaultValue} className='grow h-1' tabClass='px-4' tabs={[...TABS]} />
      </div>
    </RequireAdminPermission>
  )
}
