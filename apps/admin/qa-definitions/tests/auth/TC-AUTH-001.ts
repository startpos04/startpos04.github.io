/**
 * TC-AUTH-001 — Log In as Cashier
 *
 * Verifies that a cashier can log in and land on the POS screen.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_AUTH_001: QaTestCase = {
  id: 'TC-AUTH-001',
  title: 'Log In as Cashier',
  risk: 'CRITICAL',
  feature: 'auth',
  workflow: 'login',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT],
  establishes: [CONDITIONS.CASHIER_LOGGED_IN],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
  },

  steps: [
    {
      instruction: 'Open StartPOS in your browser.',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Enter the cashier email and password.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Enter the password.',
      copyable: { label: 'Password', value: '123qwe123!1', secret: true },
    },
    {
      instruction: 'Click the "Sign In" button.',
    },
    {
      instruction: 'Confirm you are on the POS / point-of-sale screen — not an error page.',
    },
  ],

  expected: [
    'Login succeeds without an error message.',
    'The POS screen is visible with the product grid.',
    'The top bar shows the cashier\'s name.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
