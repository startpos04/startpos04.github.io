/**
 * TC-BILL-002 — Credit Balance Displayed Correctly
 *
 * Verifies that the credit balance shown in the POS UI matches the actual
 * balance in the database and decrements by 1 after each completed sale.
 */

import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'
import type { QaTestCase } from '@/lib/qa/types'

export const TC_BILL_002: QaTestCase = {
  id: 'TC-BILL-002',
  title: 'Credit Balance Displayed Correctly',
  risk: 'HIGH',
  feature: 'billing',
  workflow: 'credits',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.SODA,
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱100.00',
  },

  steps: [
    {
      instruction: 'Log in as the admin to check the current credit balance.',
      copyable: { label: 'Admin email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Billing or the credits section and note the exact credit balance.',
      hint: 'Write this number down.',
      manualAction: true,
    },
    {
      instruction: 'Log out and log back in as the cashier.',
      copyable: { label: 'Cashier email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Find the credit balance indicator in the POS interface (usually in the top bar or side panel).',
    },
    {
      instruction: 'Confirm the displayed balance matches what you noted from the admin panel.',
    },
    {
      instruction: `Add "${QA_PRODUCTS.SODA.name}" to the cart and complete a cash sale.`,
    },
    {
      instruction: 'After the sale, check the credit balance indicator again.',
    },
    {
      instruction: 'Confirm it decreased by exactly 1.',
    },
  ],

  expected: [
    'Credit balance shown in POS matches the database value before the sale.',
    'After 1 completed sale, credit balance decreases by exactly 1.',
    'The balance update is reflected immediately without a page refresh.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
