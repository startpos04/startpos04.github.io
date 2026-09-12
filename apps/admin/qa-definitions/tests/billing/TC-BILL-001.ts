/**
 * TC-BILL-001 — Trial TX Limit Enforced
 *
 * Verifies that a business on the TRIAL plan cannot exceed 500 transactions.
 * This test validates the most critical billing guard.
 *
 * NOTE: This test requires setting up a near-limit state. In Phase 4 the
 * environment reset will support this. For now the tester sets it up manually
 * by checking the current TX count in the admin panel.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_LIMITS } from '@/lib/qa/constants'

export const TC_BILL_001: QaTestCase = {
  id: 'TC-BILL-001',
  title: 'Trial TX Limit Enforced at 500',
  risk: 'CRITICAL',
  feature: 'billing',
  workflow: 'trial-limits',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
    CONDITIONS.VENDOR_SESSION_OPEN,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    txLimit: QA_LIMITS.TRIAL_TX_LIMIT,
    product: { name: 'Any product', sku: 'any', variant: 'any' },
    note: 'Requires the business to be at TX count = 500 or within 1–2 of the limit.',
  },

  steps: [
    {
      instruction: `This test verifies the ${QA_LIMITS.TRIAL_TX_LIMIT}-transaction trial limit. It requires the QA business to be very close to the limit.`,
      hint: 'Check the transaction count in the admin panel dashboard before starting.',
    },
    {
      instruction: 'If the current TX count is below 498, this test cannot be run without manipulating the count. Mark as BLOCKED.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier with a shift open.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Attempt to add a product and complete a sale when the TX count is at exactly 500.',
    },
    {
      instruction: 'Observe whether checkout is blocked.',
    },
  ],

  expected: [
    `Checkout is blocked with a message about the ${QA_LIMITS.TRIAL_TX_LIMIT} transaction trial limit.`,
    'The block message includes guidance to upgrade the plan.',
    'No transaction is created.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
  ],
}
