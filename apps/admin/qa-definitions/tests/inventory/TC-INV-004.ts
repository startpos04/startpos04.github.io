/**
 * TC-INV-004 — Low Stock Alert Notification
 *
 * Verifies that a low-stock notification appears when a product's inventory
 * drops below the configured threshold.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.RIBS // limited stock (20)

export const TC_INV_004: QaTestCase = {
  id: 'TC-INV-004',
  title: 'Low Stock Alert Notification',
  risk: 'MEDIUM',
  feature: 'inventory',
  workflow: 'alerts',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    lowStockThreshold: 5,
    note: 'Adjust Pork Ribs stock to 6, then sell/adjust 2 to cross below threshold of 5.',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Set ${PRODUCT.name} stock to exactly 6 via manual adjustment (so we can cross the low-stock threshold in the next step).`,
      manualAction: true,
    },
    {
      instruction: 'Perform a manual stock adjustment of -2 to bring the stock to 4 (below the default threshold of 5).',
    },
    {
      instruction: 'Check the notifications bell in the top bar.',
    },
    {
      instruction: 'Look for a low-stock notification for E2E Pork Ribs Platter.',
    },
  ],

  expected: [
    'A low-stock notification appears for the product.',
    'The notification indicates the current stock level and the threshold.',
    'The product is flagged as low stock in the inventory list.',
  ],

  sourceModules: [
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory/index.tsx',
  ],
}
