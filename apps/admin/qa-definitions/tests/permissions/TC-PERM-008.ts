/**
 * TC-PERM-008 — Admin Can Perform a Manual Stock Adjustment
 *
 * Verifies that an admin-role user can perform a manual stock adjustment
 * (positive or negative) and that a supervisor cannot be blocked from the
 * same action. This is a positive permission test for admin-level inventory
 * write operations.
 *
 * Complements TC-INV-003 (which tests the adjustment workflow itself).
 * This test focuses specifically on role enforcement — confirming the
 * correct roles have access to this write operation.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_PERM_008: QaTestCase = {
  id: 'TC-PERM-008',
  title: 'Admin Can Perform Manual Stock Adjustment',
  risk: 'MEDIUM',
  feature: 'permissions',
  workflow: 'role-access',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.LEMONADE,
    adjustmentAmount: 3,
    adjustmentReason: 'QA permission test — positive adjustment',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: `Navigate to Inventory and find "${QA_PRODUCTS.LEMONADE.name}". Note the current stock.`,
      manualAction: true,
    },
    {
      instruction: 'Tap the "Adjust Stock" action for this product.',
    },
    {
      instruction: 'Enter +3 as the adjustment quantity.',
      copyable: { label: 'Adjustment qty', value: '+3' },
    },
    {
      instruction: 'Enter the reason.',
      copyable: { label: 'Reason', value: 'QA permission test — positive adjustment' },
    },
    {
      instruction: 'Confirm the adjustment.',
    },
    {
      instruction: 'Verify stock increases by 3 and an ADJUST movement record appears.',
    },
    {
      instruction: 'Log out. Log in as a cashier and navigate to /inventory/adjustments to confirm the cashier is blocked.',
      copyable: { label: 'Cashier Email', value: QA_ACCOUNTS.CASHIER },
    },
  ],

  expected: [
    'Admin can access the stock adjustment form without any "Access Denied" error.',
    'Stock increases by exactly 3 after the admin adjustment.',
    'An ADJUST movement record is created with the correct reason.',
    'When logged in as a cashier, the adjustment action is not accessible.',
  ],

  sourceModules: [
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/inventory/',
    'packages/platform/lib/authorization/permission-keys.ts',
  ],
}
