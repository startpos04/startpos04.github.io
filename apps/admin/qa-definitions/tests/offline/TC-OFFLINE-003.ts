/**
 * TC-OFFLINE-003 — Reconnect — Offline Transaction Syncs to Server
 *
 * Verifies the sync mechanism: multiple offline transactions created while
 * disconnected all appear in the server database after reconnection.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_OFFLINE_003: QaTestCase = {
  id: 'TC-OFFLINE-003',
  title: 'Reconnect — Offline Transactions Sync to Server',
  risk: 'CRITICAL',
  feature: 'offline',
  workflow: 'sync',

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
    requiredStock: 3,
    paymentMethod: 'Cash',
    tendered: '₱100.00',
    offlineSaleCount: 2,
  },

  steps: [
    {
      instruction: 'Log in as the cashier on the designated offline terminal and ensure the app is fully synced.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Note the current transaction count and credit balance.',
      manualAction: true,
    },
    {
      instruction: 'Go offline: disable your network connection.',
      manualAction: true,
    },
    {
      instruction: `Complete Sale #1 offline: add "${QA_PRODUCTS.COFFEE_SM.name}" and complete the checkout.`,
    },
    {
      instruction: `Complete Sale #2 offline: add "${QA_PRODUCTS.COFFEE_SM.name}" again and complete the checkout.`,
    },
    {
      instruction: 'Both receipts should have appeared. Note the local transaction IDs if visible.',
    },
    {
      instruction: 'Re-enable network connection.',
      manualAction: true,
    },
    {
      instruction: 'Wait for the sync indicator to finish (look for a "Synced" status or the indicator disappearing).',
    },
    {
      instruction: 'Navigate to Transaction History and verify both transactions appear.',
    },
    {
      instruction: 'Check the credit balance — it should have decreased by 2.',
    },
  ],

  expected: [
    'Both offline sales complete successfully during disconnection.',
    'After reconnecting, both transactions are visible in Transaction History.',
    'Credit balance decreases by 2 (one per transaction).',
    'Stock decreases by 2 for the product.',
    'No duplicate transactions exist.',
  ],

  sourceModules: [
    'apps/web/src/db/collections.ts',
    'apps/web/src/db/local-db-transaction.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
  ],
}
