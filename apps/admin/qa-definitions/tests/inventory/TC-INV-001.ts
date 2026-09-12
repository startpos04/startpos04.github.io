/**
 * TC-INV-001 — Quick Receive Increases Stock
 *
 * Verifies that using the "quick receive" (direct goods receipt without a PO)
 * increases the product's stock level immediately.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_INV_001: QaTestCase = {
  id: 'TC-INV-001',
  title: 'Quick Receive — Stock Increases',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'receive',

  requires: [CONDITIONS.QA_ADMIN_ACCOUNT, CONDITIONS.QA_BRANCH_EXISTS],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    receiveQuantity: 10,
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Inventory.',
    },
    {
      instruction: `Find "${PRODUCT.name}" in the inventory list and note the current stock level.`,
      hint: 'Write down the number so you can compare after.',
    },
    {
      instruction: 'Tap "Quick Receive" or "Receive Stock" for this product.',
    },
    {
      instruction: 'Enter 10 as the quantity to receive.',
    },
    {
      instruction: 'Confirm the receipt.',
    },
    {
      instruction: 'Return to the inventory list and check the stock level for the same product.',
    },
  ],

  expected: [
    'Stock level increases by exactly 10.',
    'A stock movement record appears in the movement history.',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-goods-receipt.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
