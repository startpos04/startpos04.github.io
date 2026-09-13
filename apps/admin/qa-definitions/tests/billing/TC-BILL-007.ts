/**
 * TC-BILL-007 — Low Credit Balance Warning Shown
 *
 * Verifies that when the credit balance drops below the low-balance
 * threshold (10 credits), a warning notification or banner appears
 * prompting the business to top up.
 *
 * The warning must appear without blocking checkout — sales should
 * still complete while the balance is low but above zero.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_LIMITS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_BILL_007: QaTestCase = {
  id: 'TC-BILL-007',
  title: 'Low Credit Balance — Warning Shown, Checkout Not Blocked',
  risk: 'HIGH',
  feature: 'billing',
  workflow: 'credits',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.SODA,
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱100.00',
    lowBalanceThreshold: QA_LIMITS.LOW_BALANCE_THRESHOLD,
    note: `Set the credit balance to exactly ${QA_LIMITS.LOW_BALANCE_THRESHOLD} before running. Then complete one sale to cross below the threshold.`,
  },

  steps: [
    {
      instruction: `Set the QA business credit balance to exactly ${QA_LIMITS.LOW_BALANCE_THRESHOLD} credits before starting. Do this via the admin Billing panel (grant/adjust credits to reach this number).`,
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Note the credit balance indicator — it should show ${QA_LIMITS.LOW_BALANCE_THRESHOLD}.`,
    },
    {
      instruction: `Add "${QA_PRODUCTS.SODA.name}" to the cart and complete a cash sale.`,
    },
    {
      instruction: `After the sale, the balance should be ${QA_LIMITS.LOW_BALANCE_THRESHOLD - 1} — below the threshold of ${QA_LIMITS.LOW_BALANCE_THRESHOLD}.`,
    },
    {
      instruction: 'Look for a low-balance warning notification, banner, or colour change on the credit indicator.',
    },
    {
      instruction: 'Confirm checkout is NOT blocked — attempt a second sale to verify.',
    },
  ],

  expected: [
    `After balance drops below ${QA_LIMITS.LOW_BALANCE_THRESHOLD}, a low-balance warning appears (banner, notification bell, or indicator colour change).`,
    'Warning message suggests topping up credits.',
    'Checkout is NOT blocked — sales continue while balance is low but > 0.',
    'Credit balance indicator updates immediately after each sale without a page refresh.',
    'Second sale also completes successfully.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
