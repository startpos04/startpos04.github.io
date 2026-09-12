/**
 * TC-BILL-003 — Checkout Blocked When Credits = 0
 *
 * Verifies that completing a POS sale is blocked when the business has
 * zero remaining prepaid credits.
 */

import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'
import type { QaTestCase } from '@/lib/qa/types'

export const TC_BILL_003: QaTestCase = {
  id: 'TC-BILL-003',
  title: 'Checkout Blocked — Zero Credits',
  risk: 'CRITICAL',
  feature: 'billing',
  workflow: 'credits',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.QA_BRANCH_EXISTS, CONDITIONS.VENDOR_SESSION_OPEN, CONDITIONS.QA_PRODUCT_HAS_STOCK],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.COFFEE_SM,
    requiredStock: 1,
    note: 'This test requires the QA business credit balance to be 0. Set it to 0 via admin before running, or run enough sales to drain it.',
  },

  steps: [
    {
      instruction: 'Confirm the credit balance is 0 before starting. Check the billing section in the admin panel.',
      hint: 'If balance is not 0, mark this test as BLOCKED and report it.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: `Add "${QA_PRODUCTS.COFFEE_SM.name}" to the cart.`,
    },
    {
      instruction: 'Tap "Checkout".',
    },
    {
      instruction: 'Observe whether checkout is blocked.',
    },
  ],

  expected: [
    'Checkout is blocked when credit balance is 0.',
    'An error or warning message explains that credits are exhausted.',
    'The message includes guidance on how to top up credits.',
    'No transaction is created in the database.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
  ],
}
