/**
 * TC-POS-001 — Complete a Cash Sale (Single Item)
 *
 * The most critical POS test. Verifies the full checkout flow:
 * add to cart → tender cash → receipt shown → inventory decremented → credit deducted.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.CHICKEN

export const TC_POS_001: QaTestCase = {
  id: 'TC-POS-001',
  title: 'Complete a Cash Sale (Single Item)',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'checkout',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [
    CONDITIONS.COMPLETED_SALE,
    CONDITIONS.INVENTORY_DECREASED,
    CONDITIONS.RECEIPT_GENERATED,
  ],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: PRODUCT,
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱500.00',
  },

  steps: [
    {
      instruction: 'Make sure you are logged in as the cashier with a shift open.',
      hint: `Account: ${QA_ACCOUNTS.CASHIER} — complete TC-AUTH-001 and TC-SESS-001 first.`,
    },
    {
      instruction: `Find the product "${PRODUCT.name}" (${PRODUCT.variant}) on the POS grid.`,
    },
    {
      instruction: 'Tap or click the product card once to add it to the cart.',
      hint: `It should appear in the cart at ${PRODUCT.price}.`,
    },
    {
      instruction: 'Review the cart — confirm 1 item for ₱145.00.',
    },
    {
      instruction: 'Tap "Checkout" or "Pay".',
    },
    {
      instruction: 'Select "Cash" as the payment method.',
    },
    {
      instruction: 'Enter ₱500.00 as the tendered amount.',
      hint: 'Change due: ₱355.00',
    },
    {
      instruction: 'Tap "Confirm Payment".',
    },
    {
      instruction: 'Verify a receipt appears on screen.',
    },
  ],

  expected: [
    'A receipt is shown with the correct item, price, and change (₱355.00).',
    'The transaction appears in the transaction history.',
    `${PRODUCT.name} stock decreases by 1.`,
    'One credit is deducted from the business credit balance.',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
