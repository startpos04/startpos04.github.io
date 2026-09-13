/**
 * TC-INV-005 — Void a Purchase Order Before Goods Receipt
 *
 * Verifies that an admin or supervisor can void a pending purchase order
 * before any goods have been received, and that no inventory change occurs
 * as a result of the void.
 *
 * A voided PO should be clearly marked as VOID in the purchase list and
 * must not allow a goods receipt to be created against it afterwards.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_INV_005: QaTestCase = {
  id: 'TC-INV-005',
  title: 'Void Purchase Order — No Inventory Change',
  risk: 'HIGH',
  feature: 'inventory',
  workflow: 'purchase',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.MILK_TEA_STD,
    purchaseQuantity: 10,
    unitCost: '₱50.00',
    supplierName: 'E2E Test Supplier',
    note: 'Create a fresh purchase order for this test — do NOT use a PO from TC-INV-002 that already has a GRN.',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Note the current stock level for "${QA_PRODUCTS.MILK_TEA_STD.name}".`,
      manualAction: true,
    },
    {
      instruction: 'Navigate to Inventory → Purchases and create a new purchase order.',
    },
    {
      instruction: `Add "${QA_PRODUCTS.MILK_TEA_STD.name}" with quantity 10 and unit cost ₱50.00.`,
    },
    {
      instruction: 'Submit the purchase order (status should be PENDING or APPROVED).',
    },
    {
      instruction: 'Do NOT create a goods receipt yet.',
    },
    {
      instruction: 'Find the purchase order in the list and open it.',
    },
    {
      instruction: 'Tap the "Void" or "Cancel PO" action.',
    },
    {
      instruction: 'Confirm the void.',
    },
    {
      instruction: 'Verify the PO status changes to VOID or CANCELLED.',
    },
    {
      instruction: `Check the inventory — "${QA_PRODUCTS.MILK_TEA_STD.name}" stock should be unchanged.`,
    },
    {
      instruction: 'Attempt to create a goods receipt against the voided PO — it should be blocked.',
    },
  ],

  expected: [
    'Purchase order is marked VOID/CANCELLED.',
    'No inventory movement is recorded.',
    `"${QA_PRODUCTS.MILK_TEA_STD.name}" stock level is unchanged after void.`,
    'Creating a GRN against the voided PO is blocked.',
    'The voided PO is visible in purchase history with VOID status.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/void-purchase.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory/',
  ],
}
