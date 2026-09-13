/**
 * TC-POS-007 — Split Payment (Cash + E-wallet)
 *
 * Verifies that a cashier can split a transaction across two payment methods:
 * part in cash and the remainder via e-wallet. This is a common real-world
 * scenario (customer pays what cash they have and tops up with GCash).
 *
 * Only one credit should be deducted regardless of how many payment methods
 * are used — split payment is still one transaction.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.SISIG // ₱185

export const TC_POS_007: QaTestCase = {
  id: 'TC-POS-007',
  title: 'Split Payment — Cash + E-wallet',
  risk: 'HIGH',
  feature: 'pos',
  workflow: 'checkout',

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
    product: PRODUCT,
    requiredStock: 1,
    totalAmount: '₱185.00',
    cashPortion: '₱100.00',
    ewalletPortion: '₱85.00',
    ewalletReferenceNumber: 'SPLIT-TEST-001',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Add "${PRODUCT.name}" (${PRODUCT.variant}) to the cart.`,
      hint: `Price: ${PRODUCT.price}. Total due: ₱185.00.`,
    },
    {
      instruction: 'Tap "Checkout".',
    },
    {
      instruction: 'Look for a "Split Payment" option or the ability to add multiple payment methods.',
    },
    {
      instruction: 'Select Cash and enter ₱100.00 as the cash portion.',
      copyable: { label: 'Cash amount', value: '100' },
    },
    {
      instruction: 'Add a second payment method: E-wallet / GCash for the remaining ₱85.00.',
      copyable: { label: 'GCash amount', value: '85' },
    },
    {
      instruction: 'Enter a reference number for the GCash portion.',
      copyable: { label: 'Reference No.', value: 'SPLIT-TEST-001' },
    },
    {
      instruction: 'Confirm the total covered is ₱185.00 (₱100 cash + ₱85 GCash = exact total, no change due).',
    },
    {
      instruction: 'Tap "Confirm Payment".',
    },
    {
      instruction: 'Verify the receipt is shown and lists both payment methods.',
    },
  ],

  expected: [
    'Sale completes with split payment across two methods.',
    'Receipt shows both cash (₱100) and e-wallet (₱85) payment lines.',
    'Total on receipt is ₱185.00 with ₱0 change.',
    'Only ONE credit is deducted (split payment = 1 transaction).',
    'Transaction history shows the transaction with both payment records.',
    'Stock decreases by 1.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
