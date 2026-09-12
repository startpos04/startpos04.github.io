/**
 * TC-POS-005 — Refund with Inventory Restock
 *
 * Verifies that a cashier can refund a completed transaction and that
 * the inventory is restocked and a refund receipt is issued.
 *
 * Per business policy: credits are NOT restored on refund.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_POS_005: QaTestCase = {
  id: 'TC-POS-005',
  title: 'Refund — Inventory Restocked, Credits NOT Restored',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'refund',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.COMPLETED_SALE,
    CONDITIONS.VENDOR_SESSION_OPEN,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    refundPolicy: 'Inventory restocked, credits NOT restored',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Note the current stock level and credit balance before starting.',
      hint: 'You will compare these after the refund.',
      manualAction: true,
    },
    {
      instruction: 'Complete a fresh cash sale for one Fried Chicken Meal first (required for the refund).',
      hint: 'Use TC-POS-001 if you have not already.',
    },
    {
      instruction: 'Navigate to Transaction History.',
    },
    {
      instruction: 'Find the transaction you just completed and open it.',
    },
    {
      instruction: 'Tap the "Refund" button.',
    },
    {
      instruction: 'Confirm the refund.',
    },
    {
      instruction: 'Verify a refund receipt is shown.',
    },
    {
      instruction: 'Check the inventory — the Chicken Meal stock should have increased by 1.',
    },
    {
      instruction: 'Check the credit balance — it should be the SAME as before the refund (credits are not restored).',
    },
  ],

  expected: [
    'Refund transaction is recorded in history.',
    'A refund receipt is displayed.',
    `${PRODUCT.name} stock increases by 1 (restocked).`,
    'Credit balance does NOT increase after the refund (per business policy).',
    'Original transaction shows as refunded.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
