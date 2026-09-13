/**
 * TC-SESS-004 — Two Cashiers Can Each Have Their Own Open Shift
 *
 * Verifies that multiple cashiers can each have an independent shift open
 * at the same time on the same branch. Transactions created by each cashier
 * are attributed to their respective sessions.
 *
 * This is a multi-user concurrency test that validates the session model
 * supports a real restaurant with more than one till.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_SESS_004: QaTestCase = {
  id: 'TC-SESS-004',
  title: 'Two Cashiers — Independent Shifts on Same Branch',
  risk: 'HIGH',
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
    secondAccount: QA_ACCOUNTS.CASHIER2,
    product: QA_PRODUCTS.SODA,
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱100.00',
    note: 'Requires two browser windows/tabs or two different browsers. One logged in as e2e.cashier@test.com, the other as e2e.cashier2@test.com.',
  },

  steps: [
    {
      instruction: 'Open two browser windows (or use incognito for the second).',
      hint: 'Window 1: normal browser. Window 2: incognito or different browser.',
    },
    {
      instruction: 'In Window 1: log in as Cashier.',
      copyable: { label: 'Cashier 1 Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'In Window 1: open a shift on the E2E Main Branch with ₱1000 opening cash.',
    },
    {
      instruction: 'In Window 2: log in as Cashier 2.',
      copyable: { label: 'Cashier 2 Email', value: QA_ACCOUNTS.CASHIER2 },
    },
    {
      instruction: 'In Window 2: open a separate shift on the same branch.',
    },
    {
      instruction: 'Confirm both shifts are open simultaneously (no conflict or block).',
    },
    {
      instruction: `In Window 1: complete a sale for "${QA_PRODUCTS.SODA.name}".`,
    },
    {
      instruction: `In Window 2: complete a sale for "${QA_PRODUCTS.SODA.name}".`,
    },
    {
      instruction: 'Navigate to the session/shift reports as the admin and verify two separate sessions appear, each attributed to the correct cashier.',
      copyable: { label: 'Admin Email', value: QA_ACCOUNTS.ADMIN },
    },
  ],

  expected: [
    'Both cashiers can open independent shifts on the same branch simultaneously.',
    'No error or conflict message appears when the second shift is opened.',
    'Each cashier\'s sale is attributed to their own session.',
    'Two sessions are visible in shift history, each owned by the correct cashier.',
    'Credit is deducted once per transaction (2 sales = 2 credits total).',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/open-vendor-session.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
