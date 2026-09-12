/**
 * TC-AUTH-003 — Wrong Password Shows Error
 *
 * Verifies that entering the wrong password shows a clear error and
 * does not grant access.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS } from '@/lib/qa/constants'

export const TC_AUTH_003: QaTestCase = {
  id: 'TC-AUTH-003',
  title: 'Wrong Password Shows Error',
  risk: 'HIGH',
  feature: 'auth',
  workflow: 'login',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT],
  establishes: [],

  fixture: {
    account: 'e2e.cashier@test.com',
  },

  steps: [
    {
      instruction: 'Open StartPOS in your browser.',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Enter the cashier email.',
      copyable: { label: 'Email', value: 'e2e.cashier@test.com' },
    },
    {
      instruction: 'Type an intentionally wrong password, e.g. "wrongpassword".',
      hint: 'Do NOT use the real password — this test requires an invalid credential.',
    },
    {
      instruction: 'Click the "Sign In" button.',
    },
    {
      instruction: 'Observe the result. Do NOT proceed past the login screen.',
    },
  ],

  expected: [
    'An error message appears (e.g. "Invalid credentials" or "Incorrect email or password").',
    'You remain on the login screen.',
    'No dashboard or POS screen is shown.',
  ],

  sourceModules: [
    'apps/web/src/routes/(public)/login.tsx',
  ],
}
