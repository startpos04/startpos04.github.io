/**
 * TC-PERM-003 — Supervisor Can View Sales Reports
 *
 * Verifies that a supervisor role has access to the sales reports section
 * and can view sales data for their branch.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_003: QaTestCase = {
  id: 'TC-PERM-003',
  title: 'Supervisor Can View Sales Reports',
  risk: 'MEDIUM',
  feature: 'permissions',
  workflow: 'role-access',

  requires: [
    CONDITIONS.QA_SUPERVISOR_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.SUPERVISOR,
    branch: 'E2E Main Branch',
  },

  steps: [
    {
      instruction: 'Log in as the supervisor.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.SUPERVISOR },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to the Reports or Sales section in the sidebar.',
    },
    {
      instruction: 'Verify the sales report page loads without an "Access Denied" error.',
    },
    {
      instruction: 'Check that at least one of: daily summary, transaction list, or revenue chart is visible.',
    },
  ],

  expected: [
    'Sales Reports page loads successfully for the supervisor role.',
    'No "Access Denied" or "403" error is shown.',
    'Sales data for the branch is visible.',
  ],

  sourceModules: [
    'apps/web/src/lib/authorization/permission-keys.ts',
    'apps/web/src/routes/(private)/(dashboard)/reports/',
  ],
}
