/**
 * TC-SESS-003 — Cannot Checkout Without an Open Shift
 *
 * Verifies that the POS checkout is blocked when no vendor session (shift)
 * is currently open. The cashier must open a shift before processing sales.
 *
 * This prevents unattributed transactions that would not belong to any
 * session and would break shift reconciliation reports.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_SESS_003: QaTestCase = {
  id: 'TC-SESS-003',
  title: 'Checkout Blocked — No Open Shift',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'session',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.COFFEE_SM,
    requiredStock: 1,
    note: 'Run this test immediately after closing a shift (TC-SESS-002) or before opening one. The QA environment must have no active vendor session for this cashier.',
  },

  steps: [
    {
      instruction: 'Ensure no shift is currently open for the cashier. Close any open session first (TC-SESS-002), or use a fresh login with no prior open session.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to the POS screen.',
    },
    {
      instruction: 'Observe the POS screen state — it should prompt you to open a shift rather than showing the product grid.',
    },
    {
      instruction: 'Without opening a shift, attempt to add a product to the cart.',
      hint: 'The product grid may be hidden or the add-to-cart action may be blocked.',
    },
    {
      instruction: 'If you can add a product, attempt to proceed to checkout.',
    },
    {
      instruction: 'Observe that checkout is blocked with a message about needing an open shift.',
    },
  ],

  expected: [
    'The POS screen prompts the cashier to open a shift before showing the product grid.',
    'If the product grid is visible, checkout is blocked without an open shift.',
    'A clear message explains that a shift must be opened first.',
    'An "Open Shift" button is prominently available.',
    'No transaction is created.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/open-vendor-session.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
