/**
 * TC-INV-002 — GRN Flow: Create Purchase → Confirm Goods Receipt → Stock Increases
 *
 * Verifies the full purchase order + goods receipt note flow.
 * A purchase is created, approved, and a GRN is confirmed — stock must increase.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.MILK_TEA_STD

export const TC_INV_002: QaTestCase = {
  id: 'TC-INV-002',
  title: 'Purchase → GRN → Stock Increases',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'purchase',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_SUPERVISOR_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    purchaseQuantity: 20,
    unitCost: '₱50.00',
    supplierName: 'E2E Test Supplier',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Note the current stock level for "${PRODUCT.name}" (${PRODUCT.variant}).`,
      manualAction: true,
    },
    {
      instruction: 'Navigate to Inventory → Purchases and create a new purchase order.',
    },
    {
      instruction: `Add "${PRODUCT.name}" (${PRODUCT.variant}) with quantity 20 and unit cost ₱50.00.`,
    },
    {
      instruction: 'Submit the purchase order for approval.',
    },
    {
      instruction: 'Approve the purchase order (as admin or supervisor).',
    },
    {
      instruction: 'Navigate to Goods Receipts (GRN) and create a new receipt for this purchase.',
    },
    {
      instruction: 'Enter the received quantity as 20 and confirm the GRN.',
    },
    {
      instruction: 'Return to Inventory and check the stock level for the product.',
    },
  ],

  expected: [
    'Stock level increases by exactly 20.',
    'A CONFIRMED goods receipt record exists.',
    'An inventory movement of type IN is recorded.',
    'Purchase order status is RECEIVED.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-purchase.ts',
    'apps/web/src/lib/queries/create-goods-receipt.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
