/**
 * TC-POS-009 — Cancel / Clear Cart Before Checkout
 *
 * Verifies that a cashier can abandon a cart (clear it or cancel the order)
 * before completing payment, and that no transaction, credit deduction, or
 * inventory change occurs as a result.
 *
 * This guards against accidental partial-state commits where a cart is
 * "cancelled" but the system still logs a transaction or deducts a credit.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.PASTA // ₱160

export const TC_POS_009: QaTestCase = {
  id: 'TC-POS-009',
  title: 'Cancel Cart Before Checkout — No Transaction Created',
  risk: 'HIGH',
  feature: 'pos',
  workflow: 'checkout',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    requiredStock: 2,
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Note the current credit balance and stock level before starting.',
      hint: 'Write these numbers down to compare after.',
      manualAction: true,
    },
    {
      instruction: `Add "${PRODUCT.name}" (${PRODUCT.variant}) to the cart.`,
      hint: `Price: ${PRODUCT.price}`,
    },
    {
      instruction: 'Tap "Checkout" to enter the payment screen.',
    },
    {
      instruction: 'Instead of confirming payment, tap "Cancel", "Back", or "Clear Cart" to abort the transaction.',
    },
    {
      instruction: 'Verify you are returned to the POS grid with an empty cart.',
    },
    {
      instruction: 'Check the credit balance — it should be unchanged from before.',
    },
    {
      instruction: `Check the inventory for "${PRODUCT.name}" — stock should be unchanged.`,
    },
    {
      instruction: 'Check Transaction History — no new transaction should appear.',
    },
  ],

  expected: [
    'Cart is cleared and user returns to the POS product grid.',
    'No transaction is recorded in Transaction History.',
    'Credit balance is unchanged (no deduction occurred).',
    `${PRODUCT.name} stock is unchanged (no inventory movement).`,
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
