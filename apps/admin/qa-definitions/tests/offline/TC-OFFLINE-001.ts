/**
 * TC-OFFLINE-001 — Offline Checkout on Designated Terminal Succeeds
 *
 * Verifies that a POS terminal configured as an offline-designated terminal
 * can complete a sale while disconnected from the internet, and the transaction
 * syncs to the server once connectivity is restored.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_OFFLINE_001: QaTestCase = {
  id: 'TC-OFFLINE-001',
  title: 'Offline Checkout — Designated Terminal Succeeds',
  risk: 'CRITICAL',
  feature: 'offline',
  workflow: 'offline-pos',

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
    product: QA_PRODUCTS.COFFEE_SM,
    requiredStock: 1,
    paymentMethod: 'Cash',
    tendered: '₱100.00',
    note: 'This test requires using a browser that has previously loaded the POS app with data synced. The device must be configured as the designated offline terminal for the branch.',
  },

  steps: [
    {
      instruction: 'Ensure the POS app is fully loaded and data is synced while online. Log in as the cashier first.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Verify you can see the product grid and all products load.',
    },
    {
      instruction: 'Now simulate going offline: disable your network connection (Wi-Fi off / airplane mode).',
      manualAction: true,
    },
    {
      instruction: 'Verify the app shows an offline indicator but remains usable.',
    },
    {
      instruction: `Add "${QA_PRODUCTS.COFFEE_SM.name}" to the cart while offline.`,
    },
    {
      instruction: 'Proceed to checkout and select Cash payment.',
    },
    {
      instruction: 'Complete the sale.',
    },
    {
      instruction: 'Verify the receipt is displayed even without network.',
    },
    {
      instruction: 'Re-enable your network connection.',
      manualAction: true,
    },
    {
      instruction: 'Wait for the sync indicator to complete.',
    },
    {
      instruction: 'Navigate to Transaction History and confirm the offline transaction appears.',
    },
  ],

  expected: [
    'Sale completes successfully while offline.',
    'Receipt is shown without network.',
    'After reconnecting, the transaction syncs to the server.',
    'Transaction appears in history with correct data.',
    'Stock and credit deduction are applied after sync.',
  ],

  sourceModules: [
    'apps/web/src/db/collections.ts',
    'apps/web/src/db/local-db-transaction.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
  ],
}
