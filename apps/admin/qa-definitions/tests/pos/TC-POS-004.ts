/**
 * TC-POS-004 — SC/PWD Discount (20%)
 *
 * Verifies that applying a Senior Citizen / Person with Disability discount
 * reduces the total by 20% and the receipt reflects the discount correctly.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

const PRODUCT = QA_PRODUCTS.SISIG // ₱185

export const TC_POS_004: QaTestCase = {
  id: 'TC-POS-004',
  title: 'SC/PWD Discount (20%)',
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
    paymentMethod: 'Cash',
    discountType: 'SC/PWD',
    scPwdName: 'Juan dela Cruz',
    scPwdId: 'SC-12345',
    originalPrice: '₱185.00',
    discountedPrice: '₱148.00',
    tendered: '₱200.00',
    expectedChange: '₱52.00',
  },

  steps: [
    {
      instruction: 'Log in as the cashier with an open shift.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: `Add "${PRODUCT.name}" to the cart.`,
      hint: `Base price: ${PRODUCT.price}`,
    },
    {
      instruction: 'Before checking out, look for a "Discount" or "SC/PWD" button in the cart or checkout screen.',
    },
    {
      instruction: 'Select SC/PWD discount type.',
    },
    {
      instruction: 'Enter the senior/PWD name and ID number.',
      copyable: { label: 'Name', value: 'Juan dela Cruz' },
    },
    {
      instruction: 'Confirm the discount is applied — total should drop to ₱148.00 (20% off ₱185.00).',
    },
    {
      instruction: 'Complete the sale with cash (₱200.00 tendered).',
    },
    {
      instruction: 'Verify the receipt shows the original price, 20% discount, discounted total, and change (₱52.00).',
    },
  ],

  expected: [
    'Discount reduces total by 20% (₱185.00 → ₱148.00).',
    'Receipt shows SC/PWD name and ID.',
    'Change is ₱52.00.',
    'Transaction history shows the discounted amount.',
    'One credit is deducted.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
