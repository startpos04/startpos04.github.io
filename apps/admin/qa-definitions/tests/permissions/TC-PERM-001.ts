/**
 * TC-PERM-001 — Cashier Cannot Access Employees
 *
 * Verifies that a cashier-role user is blocked from navigating to the
 * employee management section.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_001: QaTestCase = {
  id: 'TC-PERM-001',
  title: 'Cashier Cannot Access Employee Management',
  risk: 'HIGH',
  feature: 'permissions',
  workflow: 'role-enforcement',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    restrictedPath: '/employees',
  },

  steps: [
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Try to navigate directly to the Employees page.',
      hint: 'Try clicking a nav link, or type the URL manually: http://localhost:3000/employees',
      openUrl: 'http://localhost:3000/employees',
    },
    {
      instruction: 'Observe whether you are blocked or redirected.',
    },
  ],

  expected: [
    'Access is denied — the cashier is redirected or shown a "Not authorized" message.',
    'The employee list is NOT visible.',
    'No employee data is exposed.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/employees/',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
