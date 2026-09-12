/**
 * TC-AUTH-004 — Cashier Cannot Access the Products Page
 *
 * Verifies that the CASHIER role is blocked from accessing the products
 * management section — a page that requires ADMIN/SUPERVISOR access.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_AUTH_004: QaTestCase = {
  id: 'TC-AUTH-004',
  title: 'Cashier Cannot Access Products Management',
  risk: 'HIGH',
  feature: 'auth',
  workflow: 'authorization',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
    CONDITIONS.CASHIER_LOGGED_IN,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    blockedUrl: 'http://localhost:3000/products',
  },

  steps: [
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Look at the sidebar navigation — confirm there is no "Products" menu item visible.',
    },
    {
      instruction: 'Manually navigate to the products URL by typing it in the browser.',
      openUrl: 'http://localhost:3000/products',
    },
    {
      instruction: 'Observe whether access is denied or you are redirected.',
    },
  ],

  expected: [
    'Products management does NOT appear in the cashier\'s sidebar navigation.',
    'Directly navigating to /products results in an "Access Denied" page or redirect.',
    'No product management actions are available to the cashier.',
  ],

  sourceModules: [
    'apps/web/src/lib/authorization/permission-keys.ts',
    'apps/web/src/routes/(private)/(dashboard)/products/',
  ],
}
