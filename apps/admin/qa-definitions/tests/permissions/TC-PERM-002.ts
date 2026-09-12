/**
 * TC-PERM-002 — Cashier Cannot Access Product Management
 *
 * Verifies that a cashier-role user is blocked from navigating to the
 * product management section (create/edit/delete products).
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_002: QaTestCase = {
  id: 'TC-PERM-002',
  title: 'Cashier Cannot Access Product Management',
  risk: 'HIGH',
  feature: 'permissions',
  workflow: 'role-enforcement',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    restrictedPath: '/products',
  },

  steps: [
    {
      instruction: 'Log in as the cashier if not already logged in.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Try to navigate to the Products management page.',
      hint: 'Try http://localhost:3000/products or find a "Products" link in the nav.',
      openUrl: 'http://localhost:3000/products',
    },
    {
      instruction: 'Observe whether you see the product management UI or get an error.',
    },
  ],

  expected: [
    'Access is denied — the cashier is redirected or shown a "Not authorized" message.',
    'No "Add Product", "Edit", or "Delete" controls are visible.',
    'The POS product catalog view (read-only) is acceptable — only the management controls must be hidden.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/products/',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
