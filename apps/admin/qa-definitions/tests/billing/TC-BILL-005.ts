/**
 * TC-BILL-005 — Expired Subscription Still Allows Reports Access
 *
 * Verifies that even with an EXPIRED subscription, read-only pages
 * such as reports and transaction history remain accessible.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_BILL_005: QaTestCase = {
  id: 'TC-BILL-005',
  title: 'Expired Subscription — Reports Still Accessible',
  risk: 'HIGH',
  feature: 'billing',
  workflow: 'subscription',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    note: 'Requires the QA business subscription status to be EXPIRED (same setup as TC-BILL-004).',
  },

  steps: [
    {
      instruction: 'Confirm the QA business subscription status is EXPIRED.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Sales Reports.',
    },
    {
      instruction: 'Verify the page loads without a hard block.',
    },
    {
      instruction: 'Navigate to Transaction History.',
    },
    {
      instruction: 'Verify transaction history is accessible.',
    },
    {
      instruction: 'Navigate to Inventory.',
    },
    {
      instruction: 'Verify inventory is viewable (read access).',
    },
  ],

  expected: [
    'Sales Reports page loads successfully.',
    'Transaction History page loads and shows past transactions.',
    'Inventory page is accessible in read mode.',
    'No hard "access denied" error for report/history pages.',
    'POS checkout may still be blocked — this test only validates read-only access.',
  ],

  sourceModules: [
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/reports/',
    'apps/web/src/routes/(private)/(dashboard)/transactions/',
  ],
}
