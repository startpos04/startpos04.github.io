/**
 * TC-POS-003 — E-wallet Payment (GCash)
 *
 * Verifies that a cashier can select GCash as the payment method and complete
 * a sale. The receipt should reflect the e-wallet payment method.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.COFFEE_LG

export const TC_POS_003: QaTestCase = {
  id: 'TC-POS-003',
  title: 'E-wallet Payment (GCash)',
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
    paymentMethod: 'E-wallet / GCash',
    referenceNumber: 'TEST-REF-001',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: `Add "${PRODUCT.name}" (${PRODUCT.variant}) to the cart.`,
      hint: `Price: ${PRODUCT.price}`,
    },
    {
      instruction: 'Tap "Checkout".',
    },
    {
      instruction: 'Select "E-wallet" or "GCash" as the payment method.',
    },
    {
      instruction: 'Enter a reference number.',
      copyable: { label: 'Reference No.', value: 'TEST-REF-001' },
    },
    {
      instruction: 'Tap "Confirm Payment".',
    },
    {
      instruction: 'Verify the receipt is displayed and shows "GCash" as the payment method.',
    },
  ],

  expected: [
    'Sale completes successfully.',
    'Receipt shows the correct payment method (GCash/E-wallet).',
    'Reference number appears on the receipt.',
    'Transaction appears in history with e-wallet payment type.',
    'One credit is deducted.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
