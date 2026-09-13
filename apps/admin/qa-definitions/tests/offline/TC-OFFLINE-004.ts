/**
 * TC-OFFLINE-004 — Offline Data Persists After Browser Refresh
 *
 * Verifies that locally-cached POS data (products, inventory, pending
 * transactions) survives a full browser page refresh while offline.
 *
 * This guards against the scenario where a cashier accidentally refreshes
 * the page mid-shift while the network is down and loses the ability to
 * process sales because the local collection data was cleared.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_OFFLINE_004: QaTestCase = {
  id: 'TC-OFFLINE-004',
  title: 'Offline — Data Persists After Page Refresh',
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
    product: QA_PRODUCTS.COFFEE_LG,
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱200.00',
    note: 'Must be run on the designated offline terminal for the branch. Full data sync must occur while online before going offline.',
  },

  steps: [
    {
      instruction: 'Log in as the cashier on the designated offline terminal and confirm full data sync while online.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Verify the product grid loads and all products are visible.',
    },
    {
      instruction: 'Go offline: disable your network connection.',
      manualAction: true,
    },
    {
      instruction: 'Confirm the app shows an offline indicator.',
    },
    {
      instruction: 'Without reconnecting, refresh the browser page (F5 or Ctrl+R).',
    },
    {
      instruction: 'Observe whether the POS loads correctly after refresh while still offline.',
      hint: 'The product grid should reappear from the local cache — no blank screen or error.',
    },
    {
      instruction: `Add "${QA_PRODUCTS.COFFEE_LG.name}" to the cart and complete a sale.`,
    },
    {
      instruction: 'Verify the receipt is shown and the sale completes.',
    },
    {
      instruction: 'Re-enable network and confirm the transaction syncs to the server.',
      manualAction: true,
    },
  ],

  expected: [
    'After browser refresh while offline, the POS product grid reloads from local cache.',
    'No blank screen, loading spinner stuck, or data-lost error appears.',
    'The cashier can complete a sale after the refresh — offline functionality is unaffected.',
    'The shift remains open after the refresh.',
    'After reconnecting, the transaction syncs correctly.',
  ],

  sourceModules: [
    'apps/web/src/db/collections.ts',
    'apps/web/src/db/local-db-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
