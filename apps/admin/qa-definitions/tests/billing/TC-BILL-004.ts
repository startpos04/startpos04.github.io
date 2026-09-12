/**
 * TC-BILL-004 — Expired Subscription Blocks POS Checkout
 *
 * Verifies that a business with an EXPIRED subscription cannot complete
 * POS transactions, while still being able to access non-operational pages.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_BILL_004: QaTestCase = {
  id: 'TC-BILL-004',
  title: 'Expired Subscription — POS Checkout Blocked',
  risk: 'CRITICAL',
  feature: 'billing',
  workflow: 'subscription',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.COFFEE_SM,
    requiredStock: 1,
    note: 'Requires the QA business subscription status to be EXPIRED. Set it manually in the admin platform panel (update businessSubscription.status = EXPIRED) before running.',
  },

  steps: [
    {
      instruction: 'Confirm the QA business subscription status is EXPIRED before starting.',
      hint: 'Check in the admin platform panel or directly in the database.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Attempt to navigate to the POS screen.',
    },
    {
      instruction: 'Observe whether an expiry wall or warning is shown.',
    },
    {
      instruction: 'If you can reach the POS, try to add a product and proceed to checkout.',
    },
    {
      instruction: 'Observe whether the checkout is blocked.',
    },
  ],

  expected: [
    'POS checkout is blocked for an expired subscription.',
    'A clear message is shown explaining that the subscription has expired.',
    'The message includes a link or button to renew/upgrade.',
    'No transaction is created.',
  ],

  sourceModules: [
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
