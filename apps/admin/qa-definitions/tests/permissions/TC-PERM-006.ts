/**
 * TC-PERM-006 — Cashier Cannot Access Purchase Orders
 *
 * Verifies that a cashier-role user cannot access the purchase orders
 * section. Creating or viewing supplier purchase orders requires at least
 * a SUPERVISOR or ADMIN role.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_006: QaTestCase = {
  id: 'TC-PERM-006',
  title: 'Cashier Cannot Access Purchase Orders',
  risk: 'HIGH',
  feature: 'permissions',
  workflow: 'role-enforcement',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    restrictedPath: '/inventory/purchases',
  },

  steps: [
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Check the sidebar — confirm there is no "Purchases" or "Purchase Orders" link visible.',
    },
    {
      instruction: 'Manually navigate to the purchases URL.',
      openUrl: 'http://localhost:3000/inventory/purchases',
    },
    {
      instruction: 'Observe whether access is denied or you are redirected.',
    },
  ],

  expected: [
    'Purchase Orders does NOT appear in the cashier\'s navigation.',
    'Directly navigating to /inventory/purchases results in an "Access Denied" page or redirect.',
    'No purchase order data, supplier names, or cost information is visible.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/inventory/',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
