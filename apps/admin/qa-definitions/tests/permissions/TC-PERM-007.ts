/**
 * TC-PERM-007 — Supervisor Can Approve a Purchase Order
 *
 * Verifies that a supervisor-role user has the permission to approve a
 * pending purchase order. This is a positive permission test — confirming
 * that supervisors can perform the operational actions they are supposed to,
 * not just that they are blocked from admin-only actions.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_PERM_007: QaTestCase = {
  id: 'TC-PERM-007',
  title: 'Supervisor Can Approve a Purchase Order',
  risk: 'MEDIUM',
  feature: 'permissions',
  workflow: 'role-access',

  requires: [
    CONDITIONS.QA_SUPERVISOR_ACCOUNT,
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.SUPERVISOR,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.COFFEE_SM,
    purchaseQuantity: 5,
    unitCost: '₱30.00',
    supplierName: 'E2E Test Supplier',
    note: 'The admin creates the PO first, then the supervisor approves it.',
  },

  steps: [
    {
      instruction: 'Log in as the admin and create a new purchase order.',
      copyable: { label: 'Admin Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Add "${QA_PRODUCTS.COFFEE_SM.name}" with quantity 5 and unit cost ₱30.00. Submit the PO (leave it in PENDING status — do not approve it yourself).`,
    },
    {
      instruction: 'Log out and log in as the supervisor.',
      copyable: { label: 'Supervisor Email', value: QA_ACCOUNTS.SUPERVISOR },
    },
    {
      instruction: 'Navigate to Inventory → Purchases.',
    },
    {
      instruction: 'Find the pending purchase order just created.',
    },
    {
      instruction: 'Tap the "Approve" button.',
    },
    {
      instruction: 'Confirm the approval.',
    },
    {
      instruction: 'Verify the PO status changes to APPROVED.',
    },
  ],

  expected: [
    'Supervisor can see the Purchases section.',
    'Supervisor can approve a pending purchase order without an "Access Denied" error.',
    'PO status changes to APPROVED after the supervisor\'s action.',
    'No error messages appear.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/inventory/',
    'packages/platform/lib/authorization/permission-keys.ts',
    'apps/web/src/lib/queries/create-purchase.ts',
  ],
}
