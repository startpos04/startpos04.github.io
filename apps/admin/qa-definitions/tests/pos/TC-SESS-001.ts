/**
 * TC-SESS-001 — Open a Shift (Vendor Session)
 *
 * Verifies that a cashier can open a shift (vendor session) before
 * processing sales. This is a prerequisite for all POS checkout tests.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_SESS_001: QaTestCase = {
  id: 'TC-SESS-001',
  title: 'Open a Shift',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'session',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.QA_BRANCH_EXISTS, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [CONDITIONS.VENDOR_SESSION_OPEN],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
  },

  steps: [
    {
      instruction: 'Log in as the cashier if not already logged in.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'On the POS screen, tap or click "Open Shift".',
      hint: 'This button usually appears as a prompt when no shift is currently open.',
    },
    {
      instruction: 'Enter the opening cash amount.',
      hint: 'Enter "0" or any reasonable starting amount (e.g. ₱1000).',
    },
    {
      instruction: 'Confirm the shift open.',
    },
    {
      instruction: 'Verify the shift status shows "Open" or that the POS product grid is now accessible.',
    },
  ],

  expected: [
    'The shift opens successfully.',
    'The POS product grid is accessible.',
    'A shift open confirmation or indicator is visible.',
    'The shift timestamp is recorded.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/open-vendor-session.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
