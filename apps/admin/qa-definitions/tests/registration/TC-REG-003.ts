/**
 * TC-REG-003 — 50 Complimentary Credits on Registration
 *
 * Verifies that the 50 starting credits granted at registration
 * are usable for real POS transactions immediately.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { QA_LIMITS } from '@/lib/qa/constants'

export const TC_REG_003: QaTestCase = {
  id: 'TC-REG-003',
  title: '50 Complimentary Credits Usable After Registration',
  risk: 'HIGH',
  feature: 'registration',
  workflow: 'credits',

  requires: [],
  establishes: [],

  fixture: {
    note: 'Run on the newly-registered business from TC-REG-001. Requires the onboarding to be complete (branch configured and at least one product created).',
    startingCredits: QA_LIMITS.STARTING_CREDITS,
  },

  steps: [
    {
      instruction: 'Use the newly-registered business from TC-REG-001. Ensure onboarding is complete — you have a branch and at least one product.',
    },
    {
      instruction: 'Navigate to Billing and confirm the credit balance is exactly 50.',
    },
    {
      instruction: 'Open a vendor session (shift) and complete a POS sale.',
    },
    {
      instruction: 'After the sale, check the credit balance.',
    },
    {
      instruction: 'Confirm it decreased from 50 to 49.',
    },
    {
      instruction: 'Check the credit ledger / history — an entry for the initial PROMOTIONAL grant of 50 should be visible.',
    },
  ],

  expected: [
    'Credit balance starts at 50 after registration.',
    'Each completed sale deducts 1 credit.',
    'After first sale, balance is 49.',
    'Credit ledger shows a PROMOTIONAL entry for the initial 50 credits.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/complete-registration.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
  ],
}
