/**
 * TC-POS-006 — Checkout Blocked When Product is Out of Stock
 *
 * Verifies that adding a zero-stock product to the cart and attempting
 * checkout is blocked with an appropriate out-of-stock error.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_POS_006: QaTestCase = {
  id: 'TC-POS-006',
  title: 'Checkout Blocked — Out of Stock',
  risk: 'HIGH',
  feature: 'pos',
  workflow: 'checkout',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    note: 'Requires a product with 0 stock. The E2E Pork Ribs Platter (E2E-RIBS-HALF) has limited stock — set it to 0 in the admin inventory before running.',
    product: { name: 'E2E Pork Ribs Platter', variant: 'Half Rack', sku: 'E2E-RIBS-HALF', price: '₱320.00' },
    requiredStock: 0,
  },

  steps: [
    {
      instruction: 'Before this test: confirm the E2E Pork Ribs Platter stock is 0 (or adjust it to 0 via Quick Receive → set to 0). Mark as BLOCKED if you cannot set it to 0.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Search for "E2E Pork Ribs Platter" on the POS grid.',
    },
    {
      instruction: 'Observe whether the product card is greyed out or shows "Out of Stock".',
    },
    {
      instruction: 'If the card is tappable, try to add it to the cart and proceed to checkout.',
    },
    {
      instruction: 'Observe the system behaviour — it should block the sale.',
    },
  ],

  expected: [
    'The product is visually indicated as out of stock (greyed out or labelled).',
    'If added to cart, checkout is blocked with an out-of-stock error.',
    'No transaction is created.',
    'No inventory movement is recorded.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
