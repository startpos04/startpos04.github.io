/**
 * TC-BILL-006 — Grace Period UI Warning Shown After Payment Failure
 *
 * Verifies that when a subscription enters GRACE_PERIOD status, the UI
 * shows a visible warning banner and that POS checkout continues to work
 * during the grace window (not blocked yet).
 *
 * Grace period = 7 days after a payment failure before the subscription
 * hard-expires and blocks operational features.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_LIMITS, QA_PRODUCTS } from '@/lib/qa/constants'

export const TC_BILL_006: QaTestCase = {
  id: 'TC-BILL-006',
  title: 'Grace Period — Warning Shown, POS Still Operational',
  risk: 'CRITICAL',
  feature: 'billing',
  workflow: 'subscription',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_CASHIER_ACCOUNT,
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
    gracePeriodDays: QA_LIMITS.GRACE_PERIOD_DAYS,
    note: `Requires the QA business subscription status to be GRACE_PERIOD. Set it manually via the admin platform panel (update businessSubscription.status = GRACE_PERIOD, set gracePeriodEndsAt = now + ${QA_LIMITS.GRACE_PERIOD_DAYS} days) before running.`,
  },

  steps: [
    {
      instruction: `Set the QA business subscription to GRACE_PERIOD status before starting. Set gracePeriodEndsAt to ${QA_LIMITS.GRACE_PERIOD_DAYS} days from now.`,
      hint: 'Update directly in the database or via the admin platform panel.',
      manualAction: true,
    },
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Check the dashboard — look for a warning banner or notification about the payment failure / grace period.',
    },
    {
      instruction: 'Note the warning message content. It should mention the grace period end date and a call to action to update payment.',
    },
    {
      instruction: 'Log out and log in as the cashier.',
      copyable: { label: 'Cashier Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Navigate to the POS screen.',
    },
    {
      instruction: 'Confirm a grace period warning is also visible to the cashier (banner or indicator).',
    },
    {
      instruction: `Add "${QA_PRODUCTS.COFFEE_SM.name}" to the cart and attempt checkout.`,
    },
    {
      instruction: 'Complete the sale.',
    },
  ],

  expected: [
    'A visible warning banner appears for both admin and cashier roles during grace period.',
    `Warning message mentions the grace period end date and references the ${QA_LIMITS.GRACE_PERIOD_DAYS}-day window.`,
    'Warning includes a link or button to update payment method / reactivate.',
    'POS checkout SUCCEEDS during grace period — sales are NOT blocked.',
    'One credit is deducted normally.',
    'No hard "subscription expired" block is shown.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/subscription-engine.ts',
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
