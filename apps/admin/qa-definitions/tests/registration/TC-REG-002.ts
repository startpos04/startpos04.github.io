/**
 * TC-REG-002 — Trial Subscription Auto-Provisioned on Registration
 *
 * Verifies that immediately after registration, the new business has
 * a TRIAL subscription with the correct limits configured.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { QA_LIMITS } from '@/lib/qa/constants'

export const TC_REG_002: QaTestCase = {
  id: 'TC-REG-002',
  title: 'Trial Subscription Auto-Provisioned on Registration',
  risk: 'CRITICAL',
  feature: 'registration',
  workflow: 'subscription-setup',

  requires: [],
  establishes: [],

  fixture: {
    note: 'Run immediately after TC-REG-001 using the same newly-created account.',
    trialTxLimit: QA_LIMITS.TRIAL_TX_LIMIT,
    trialDurationDays: QA_LIMITS.TRIAL_DURATION_DAYS,
  },

  steps: [
    {
      instruction: 'Complete TC-REG-001 first (register a new business). Use that account for this test.',
    },
    {
      instruction: 'After registration, navigate to Billing or Subscription in the main menu.',
    },
    {
      instruction: 'Verify the subscription plan shows "Trial".',
    },
    {
      instruction: `Verify the transaction limit shows ${QA_LIMITS.TRIAL_TX_LIMIT} transactions.`,
    },
    {
      instruction: `Verify the trial expiry date is approximately ${QA_LIMITS.TRIAL_DURATION_DAYS} days from today.`,
    },
    {
      instruction: 'Navigate to the credit balance section.',
    },
    {
      instruction: `Verify ${QA_LIMITS.STARTING_CREDITS} credits appear in the balance.`,
    },
  ],

  expected: [
    'Subscription status is TRIAL.',
    `Transaction limit is ${QA_LIMITS.TRIAL_TX_LIMIT}.`,
    `Trial expires approximately ${QA_LIMITS.TRIAL_DURATION_DAYS} days from registration.`,
    `Credit balance shows ${QA_LIMITS.STARTING_CREDITS} complimentary credits.`,
    'No payment has been taken.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/complete-registration.ts',
    'apps/web/src/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
  ],
}
