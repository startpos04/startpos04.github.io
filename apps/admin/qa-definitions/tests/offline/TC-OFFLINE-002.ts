/**
 * TC-OFFLINE-002 — Offline Checkout on Non-Designated Terminal Blocked
 *
 * Verifies that a terminal NOT configured as the designated offline terminal
 * cannot complete sales while disconnected — prevents duplicate offline terminals.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_OFFLINE_002: QaTestCase = {
  id: 'TC-OFFLINE-002',
  title: 'Offline Checkout — Non-Designated Terminal Blocked',
  risk: 'HIGH',
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
    account: QA_ACCOUNTS.CASHIER2,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.SODA,
    requiredStock: 1,
    note: 'Use a different browser or incognito window from TC-OFFLINE-001. This terminal has NOT been set as the designated offline terminal for the branch.',
  },

  steps: [
    {
      instruction: 'Open the POS app in a different browser or incognito window (not the same session used in TC-OFFLINE-001).',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Log in as cashier2.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER2 },
    },
    {
      instruction: 'Verify the app loads and products are visible while online.',
    },
    {
      instruction: 'Disable network connection (Wi-Fi off / airplane mode).',
      manualAction: true,
    },
    {
      instruction: `Add "${QA_PRODUCTS.SODA.name}" to the cart.`,
    },
    {
      instruction: 'Attempt to proceed to checkout.',
    },
    {
      instruction: 'Observe whether the checkout is blocked with an offline/terminal message.',
    },
  ],

  expected: [
    'Checkout is blocked on the non-designated terminal when offline.',
    'An error message explains that offline mode is not available on this terminal.',
    'No transaction is created.',
  ],

  sourceModules: [
    'apps/web/src/db/collections.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
  ],
}
