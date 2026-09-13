/**
 * TC-INV-006 — Partial GRN: Receive Less Than Ordered Quantity
 *
 * Verifies that a goods receipt can be confirmed for a quantity LESS than
 * the purchase order quantity (a partial delivery). Stock should increase
 * only by the actually-received amount, not the full PO quantity.
 *
 * The purchase order status after a partial receipt should indicate that
 * not all items have been received (e.g. PARTIALLY_RECEIVED).
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.LEMONADE

export const TC_INV_006: QaTestCase = {
  id: 'TC-INV-006',
  title: 'Partial GRN — Receive Less Than Ordered Quantity',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'purchase',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    purchaseQuantity: 20,
    receivedQuantity: 12,
    unitCost: '₱30.00',
    supplierName: 'E2E Test Supplier',
    note: 'Order 20 units but only receive 12. Verify stock increases by 12, not 20.',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Note the current stock level for "${PRODUCT.name}".`,
      manualAction: true,
    },
    {
      instruction: 'Navigate to Inventory → Purchases and create a new purchase order.',
    },
    {
      instruction: `Add "${PRODUCT.name}" with quantity 20 and unit cost ₱30.00.`,
    },
    {
      instruction: 'Submit and approve the purchase order.',
    },
    {
      instruction: 'Navigate to Goods Receipts (GRN) and create a new receipt for this purchase.',
    },
    {
      instruction: 'Enter 12 as the received quantity — NOT 20.',
      hint: 'This simulates a partial delivery from the supplier.',
      copyable: { label: 'Received qty', value: '12' },
    },
    {
      instruction: 'Confirm the GRN.',
    },
    {
      instruction: `Return to Inventory and check the stock level for "${PRODUCT.name}".`,
    },
    {
      instruction: 'Check the purchase order status — it should indicate partial receipt.',
    },
  ],

  expected: [
    'Stock increases by exactly 12 (the received qty), not 20 (the ordered qty).',
    'An inventory movement of type IN for quantity 12 is recorded.',
    'The purchase order status reflects partial receipt (e.g. PARTIALLY_RECEIVED or still PENDING for remaining 8).',
    'GRN record shows received qty 12 against ordered qty 20.',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-goods-receipt.ts',
    'apps/web/src/lib/queries/confirm-goods-receipt.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
