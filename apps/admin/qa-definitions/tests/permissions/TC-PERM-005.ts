/**
 * TC-PERM-005 — Cashier Cannot Access Inventory Management
 *
 * Verifies that a cashier-role user cannot access inventory management
 * pages (adjust stock, view movement history, manage batches).
 *
 * The cashier role is limited to POS operations only. Inventory management
 * requires at least a SUPERVISOR or ADMIN role.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_005: QaTestCase = {
  id: 'TC-PERM-005',
  title: 'Cashier Cannot Access Inventory Management',
  risk: 'HIGH',
  feature: 'permissions',
  workflow: 'role-enforcement',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    restrictedPath: '/inventory',
  },

  steps: [
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Check the sidebar — confirm there is no "Inventory" menu item visible for the cashier role.',
    },
    {
      instruction: 'Manually navigate to the Inventory URL.',
      openUrl: 'http://localhost:3000/inventory',
    },
    {
      instruction: 'Observe whether access is denied or you are redirected.',
    },
    {
      instruction: 'Also attempt to navigate to the stock adjustments page directly.',
      openUrl: 'http://localhost:3000/inventory/adjustments',
    },
  ],

  expected: [
    'Inventory management does NOT appear in the cashier\'s sidebar.',
    'Directly navigating to /inventory results in an "Access Denied" page or redirect to POS.',
    'No stock adjustment, batch management, or movement history controls are visible.',
    'No inventory data is exposed to the cashier role.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/inventory/',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
