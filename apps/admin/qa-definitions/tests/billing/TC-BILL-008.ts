/**
 * TC-BILL-008 — Suspended Account Blocks All Operational Features
 *
 * Verifies that a business with SUSPENDED subscription status cannot
 * access any operational features (POS checkout, inventory movements,
 * purchase orders) but that an admin-facing message explains the suspension.
 *
 * SUSPENDED differs from EXPIRED: it is an explicit admin action, not
 * a billing failure. The block is immediate with no grace period.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_BILL_008: QaTestCase = {
  id: 'TC-BILL-008',
  title: 'Suspended Account — All Operational Features Blocked',
  risk: 'CRITICAL',
  feature: 'billing',
  workflow: 'subscription',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.VENDOR_SESSION_OPEN,
    CONDITIONS.QA_PRODUCT_HAS_STOCK,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    product: QA_PRODUCTS.COFFEE_SM,
    requiredStock: 1,
    note: 'Requires the QA business subscription status to be SUSPENDED. Set it manually via the admin platform panel (update businessSubscription.status = SUSPENDED) before running.',
  },

  steps: [
    {
      instruction: 'Set the QA business subscription to SUSPENDED status before starting.',
      hint: 'Update directly in the database or via the admin platform panel.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the cashier.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Attempt to navigate to the POS screen.',
    },
    {
      instruction: 'Observe whether an account suspended wall or message is shown.',
    },
    {
      instruction: 'If you can reach the POS, try to add a product and proceed to checkout.',
    },
    {
      instruction: 'Observe whether checkout is blocked with a suspension-specific message.',
    },
    {
      instruction: 'Log out and log in as the admin.',
      copyable: { label: 'Admin Email', value: QA_ACCOUNTS.ADMIN },
    },
    {
      instruction: 'Check whether the admin dashboard shows a suspension notice with a contact support prompt.',
    },
  ],

  expected: [
    'POS checkout is blocked for a suspended account.',
    'The block message explicitly says "account suspended" — not "expired" (clear distinction).',
    'The message includes a "contact support" prompt or link.',
    'No transaction is created.',
    'The admin also sees the suspension notice on their dashboard.',
    'Management read-only pages (reports, transaction history) may still be accessible.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/subscription-engine.ts',
    'packages/platform/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
