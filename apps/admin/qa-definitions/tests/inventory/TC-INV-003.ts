/**
 * TC-INV-003 — Manual Stock Adjustment
 *
 * Verifies that an admin or supervisor can manually adjust the stock level
 * of a product (positive or negative) and the movement is recorded.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.LEMONADE

export const TC_INV_003: QaTestCase = {
  id: 'TC-INV-003',
  title: 'Manual Stock Adjustment',
  risk: 'MEDIUM',
  feature: 'inventory',
  workflow: 'adjustment',

  requires: [CONDITIONS.QA_ADMIN_ACCOUNT, CONDITIONS.QA_BRANCH_EXISTS],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    adjustmentAmount: -5,
    adjustmentReason: 'QA test — manual waste disposal',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Navigate to Inventory and find "${PRODUCT.name}". Note the current stock.`,
      manualAction: true,
    },
    {
      instruction: 'Tap "Adjust Stock" or the adjustment action for this product.',
    },
    {
      instruction: 'Enter -5 as the adjustment quantity (a reduction of 5 units).',
    },
    {
      instruction: 'Enter a reason: "QA test — manual waste disposal".',
      copyable: { label: 'Reason', value: 'QA test — manual waste disposal' },
    },
    {
      instruction: 'Confirm the adjustment.',
    },
    {
      instruction: 'Verify the stock decreased by 5.',
    },
    {
      instruction: 'Check the movement history — an ADJUST entry should appear.',
    },
  ],

  expected: [
    'Stock level decreases by exactly 5.',
    'An inventory movement of type ADJUST is recorded with the reason.',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory/index.tsx',
  ],
}
