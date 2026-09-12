/**
 * TC-SESS-002 — Close Vendor Session with Cash Reconciliation
 *
 * Verifies that a cashier can close their shift, enter the physical cash count,
 * and the system records the session closing summary correctly.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_SESS_002: QaTestCase = {
  id: 'TC-SESS-002',
  title: 'Close Vendor Session with Cash Reconciliation',
  risk: 'HIGH',
  feature: 'pos',
  workflow: 'session',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.COMPLETED_SALE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift that has at least one completed sale.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Locate the "Close Shift" or "End Session" button — usually in the top bar or side menu.',
    },
    {
      instruction: 'Tap "Close Shift".',
    },
    {
      instruction: 'The system will show the expected cash amount based on sales. Enter the physical cash count in the drawer.',
      hint: 'Enter the same amount shown to simulate a balanced till.',
    },
    {
      instruction: 'Confirm and close the session.',
    },
    {
      instruction: 'Verify you are shown a closing summary with total sales and cash counted.',
    },
  ],

  expected: [
    'Session is marked CLOSED in the database.',
    'A closing summary screen shows total cash sales and the counted amount.',
    'No further POS transactions can be created until a new session is opened.',
    'Session history is accessible from the reports section.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/close-vendor-session.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
