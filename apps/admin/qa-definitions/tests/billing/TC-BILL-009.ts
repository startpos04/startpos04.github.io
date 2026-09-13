/**
 * TC-BILL-009 — Trial Days Remaining Indicator Visible
 *
 * Verifies that a business on a TRIAL subscription can see how many days
 * remain in their trial period and how many transactions have been used
 * out of the 500-transaction limit.
 *
 * This is a visibility and UX test — the tester confirms the information
 * is surfaced clearly so the business owner can make an upgrade decision
 * before the trial expires.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS, QA_LIMITS } from '@/lib/qa/constants'

export const TC_BILL_009: QaTestCase = {
  id: 'TC-BILL-009',
  title: 'Trial — Days Remaining and TX Usage Visible',
  risk: 'HIGH',
  feature: 'billing',
  workflow: 'trial-limits',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    trialTxLimit: QA_LIMITS.TRIAL_TX_LIMIT,
    trialDurationDays: QA_LIMITS.TRIAL_DURATION_DAYS,
    note: 'Run on a business that is currently on the TRIAL plan. The QA test business should be in TRIAL status.',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to the Billing or Subscription section from the main menu.',
    },
    {
      instruction: 'Locate the trial status card or section.',
    },
    {
      instruction: 'Verify that the number of days remaining in the trial is displayed.',
      hint: 'Should show something like "22 days remaining" or a countdown.',
    },
    {
      instruction: `Verify that the transaction usage is displayed — e.g. "X / ${QA_LIMITS.TRIAL_TX_LIMIT} transactions used".`,
    },
    {
      instruction: 'Navigate to the POS screen as the cashier.',
      copyable: { label: 'Cashier Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Check whether a trial indicator (days or TX count) is also visible from the POS screen.',
    },
  ],

  expected: [
    'Billing page shows the trial expiry date or days remaining.',
    `Transaction usage is visible (current count vs. ${QA_LIMITS.TRIAL_TX_LIMIT} limit).`,
    'A "Upgrade Plan" or "Choose a Plan" call-to-action button is present.',
    'The information is accurate — days remaining matches the trial start date.',
    'Ideally a trial indicator (at minimum days remaining) is visible from the POS screen too.',
  ],

  sourceModules: [
    'apps/web/src/lib/billing/subscription-engine.ts',
    'packages/platform/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/billing/',
  ],
}
