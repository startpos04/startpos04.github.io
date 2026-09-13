/**
 * TC-POS-008 — Increase Item Quantity in Cart (qty > 1)
 *
 * Verifies that a cashier can add the same product multiple times or
 * adjust the quantity of a cart line item directly, and that the total
 * price and inventory deduction both reflect the correct quantity.
 *
 * This is distinct from TC-POS-002 (two different products) — here we
 * test quantity adjustment on a single product line.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.COFFEE_SM // ₱80

export const TC_POS_008: QaTestCase = {
  id: 'TC-POS-008',
  title: 'Cart — Increase Item Quantity to 3',
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
    requiredStock: 5,
    quantity: 3,
    unitPrice: '₱80.00',
    expectedTotal: '₱240.00',
    paymentMethod: 'Cash',
    tendered: '₱300.00',
    expectedChange: '₱60.00',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Add "${PRODUCT.name}" (${PRODUCT.variant}) to the cart.`,
      hint: `Unit price: ${PRODUCT.price}`,
    },
    {
      instruction: 'Increase the quantity to 3 — either tap the product card 2 more times, or use the quantity +/- controls on the cart line item.',
    },
    {
      instruction: 'Confirm the cart shows: 1 line item × qty 3 = ₱240.00.',
    },
    {
      instruction: 'Tap "Checkout", select Cash, and enter ₱300.00.',
    },
    {
      instruction: 'Tap "Confirm Payment".',
    },
    {
      instruction: 'Verify the receipt shows qty 3 and correct change.',
    },
    {
      instruction: `Check the inventory — ${PRODUCT.name} stock should have decreased by exactly 3.`,
    },
  ],

  expected: [
    'Cart line item shows quantity 3 and subtotal ₱240.00 (3 × ₱80).',
    'Receipt shows quantity 3, unit price ₱80.00, total ₱240.00, change ₱60.00.',
    'Stock decreases by exactly 3.',
    'Only ONE credit is deducted (quantity > 1 is still one transaction).',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
