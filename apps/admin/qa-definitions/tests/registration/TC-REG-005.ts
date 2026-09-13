/**
 * TC-REG-005 — Onboarding: Create First Product and Branch
 *
 * Verifies that a newly-registered business can complete the onboarding
 * wizard by creating their first branch and first product, and that
 * the POS becomes operational immediately after.
 *
 * This is the bridge between registration and first sale — if onboarding
 * is broken, the business can never use the POS regardless of subscription status.
 */

import type { QaTestCase } from '@/lib/qa/types'

export const TC_REG_005: QaTestCase = {
  id: 'TC-REG-005',
  title: 'Onboarding — Create First Branch and Product, POS Operational',
  risk: 'CRITICAL',
  feature: 'registration',
  workflow: 'onboarding',

  requires: [],
  establishes: [],

  fixture: {
    note: 'Run using the newly-registered account from TC-REG-001 that has not yet completed onboarding.',
    newBranchName: 'Main Branch',
    newCategoryName: 'Beverages',
    newProductName: 'Test Coffee',
    newProductPrice: '₱80.00',
    newProductSku: 'TEST-COF-001',
  },

  steps: [
    {
      instruction: 'Use the account from TC-REG-001. After registration, you should be on the onboarding screen.',
      hint: 'If onboarding was already completed, skip to step 9 and verify POS is accessible.',
    },
    {
      instruction: 'Complete the onboarding step for business details (if not already done during registration).',
    },
    {
      instruction: 'Create your first branch.',
      copyable: { label: 'Branch name', value: 'Main Branch' },
    },
    {
      instruction: 'Create a product category.',
      copyable: { label: 'Category name', value: 'Beverages' },
    },
    {
      instruction: 'Create your first product.',
      copyable: { label: 'Product name', value: 'Test Coffee' },
    },
    {
      instruction: 'Set the product price to ₱80.00.',
      copyable: { label: 'Price', value: '80' },
    },
    {
      instruction: 'Set an initial stock quantity (e.g. 10 units).',
      copyable: { label: 'Initial stock', value: '10' },
    },
    {
      instruction: 'Complete the onboarding wizard.',
    },
    {
      instruction: 'Navigate to the POS screen.',
    },
    {
      instruction: 'Verify the product "Test Coffee" appears in the POS product grid.',
    },
    {
      instruction: 'Open a shift and complete a test sale.',
    },
  ],

  expected: [
    'Onboarding wizard completes without errors.',
    'A branch record is created in the database.',
    'A product and variant record are created.',
    'Initial stock is set correctly.',
    'POS screen shows the new product in the grid.',
    'A sale can be completed immediately after onboarding — no additional setup needed.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/complete-registration.ts',
    'apps/web/src/routes/(public)/register/',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
