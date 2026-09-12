/**
 * TC-POS-002 — Cash Sale with Multiple Items
 *
 * Verifies that a cart with more than one distinct product line item
 * totals correctly and completes checkout.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_POS_002: QaTestCase = {
  id: 'TC-POS-002',
  title: 'Cash Sale — Multiple Items',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'checkout',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [CONDITIONS.COMPLETED_SALE],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.CHICKEN,        // ₱145
    secondProduct: QA_PRODUCTS.COFFEE_SM, // ₱80
    expectedTotal: '₱225.00',
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱500.00',
    expectedChange: '₱275.00',
  },

  steps: [
    {
      instruction: 'Make sure you are logged in as the cashier with a shift open.',
    },
    {
      instruction: `Add "${QA_PRODUCTS.CHICKEN.name}" (${QA_PRODUCTS.CHICKEN.variant}) to the cart.`,
      hint: `Price: ${QA_PRODUCTS.CHICKEN.price}`,
    },
    {
      instruction: `Also add "${QA_PRODUCTS.COFFEE_SM.name}" (${QA_PRODUCTS.COFFEE_SM.variant}) to the cart.`,
      hint: `Price: ${QA_PRODUCTS.COFFEE_SM.price}`,
    },
    {
      instruction: 'Confirm the cart shows 2 line items and total is ₱225.00.',
    },
    {
      instruction: 'Tap "Checkout", select "Cash", and enter ₱500.00.',
    },
    {
      instruction: 'Tap "Confirm Payment".',
    },
    {
      instruction: 'Verify the receipt shows both items and correct change.',
    },
  ],

  expected: [
    'Cart total is ₱225.00 (₱145 + ₱80).',
    'Receipt shows both line items.',
    'Change is ₱275.00.',
    'One credit is deducted (one transaction = one credit regardless of item count).',
    'Stock decreases for both products by 1 each.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
