/**
 * TC-AUTH-005 — Log In as Supervisor
 *
 * Verifies that a supervisor-role user can log in and reaches a dashboard
 * view (not the POS cashier screen). Confirms the supervisor role is
 * distinct from both cashier and admin.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_AUTH_005: QaTestCase = {
  id: 'TC-AUTH-005',
  title: 'Log In as Supervisor',
  risk: 'HIGH',
  feature: 'auth',
  workflow: 'login',

  requires: [CONDITIONS.QA_SUPERVISOR_ACCOUNT],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.SUPERVISOR,
  },

  steps: [
    {
      instruction: 'Open StartPOS in your browser.',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Enter the supervisor email.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.SUPERVISOR },
    },
    {
      instruction: 'Enter the password.',
      copyable: { label: 'Password', value: '123qwe123!1', secret: true },
    },
    {
      instruction: 'Click the "Sign In" button.',
    },
    {
      instruction: 'Observe which screen you land on after login.',
    },
    {
      instruction: 'Check the sidebar navigation — confirm which items are visible to the supervisor role.',
      hint: 'Supervisors should see reports, inventory, and purchasing — but NOT employee management or billing.',
    },
  ],

  expected: [
    'Login succeeds without an error message.',
    'Supervisor lands on the dashboard (not the POS cashier screen).',
    'Sidebar includes: Reports, Inventory, Purchases.',
    'Sidebar does NOT include: Employees (create/edit), Billing/Subscription management.',
    'No "Access Denied" error appears on the default landing page.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/dashboard/index.tsx',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
